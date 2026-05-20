import type {
  CanvasAssignment,
  CanvasCalendarEvent,
  CanvasCourse,
} from "@/types";

// ─── Error Classes ───────────────────────────────────────────────────────

export class CanvasAuthError extends Error {
  constructor(message = "Canvas authentication failed") {
    super(message);
    this.name = "CanvasAuthError";
  }
}

export class CanvasRateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter = 60) {
    super("Canvas rate limit exceeded");
    this.name = "CanvasRateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class CanvasNetworkError extends Error {
  constructor(message = "Failed to connect to Canvas") {
    super(message);
    this.name = "CanvasNetworkError";
  }
}

// ─── Client Options ──────────────────────────────────────────────────────

interface CanvasClientOpts {
  baseUrl: string;
  token: string;
}

interface FetchOpts {
  params?: Record<string, string | string[]>;
}

interface FetchResult<T> {
  data: T;
  nextPath: string | null;
  rateLimitRemaining: number | null;
}

// ─── Internal Helpers ────────────────────────────────────────────────────

function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const parts = linkHeader.split(",");
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) {
      // Extract the path after /api/canvas/ from the full URL,
      // or if it's a Canvas URL, extract after /api/v1/
      const url = match[1];
      try {
        const parsed = new URL(url, window.location.origin);
        const pathname = parsed.pathname;
        // If the link points to our proxy
        if (pathname.startsWith("/api/canvas/")) {
          return pathname.replace("/api/canvas/", "") + parsed.search;
        }
        // If the link points to Canvas directly
        if (pathname.includes("/api/v1/")) {
          const afterV1 = pathname.split("/api/v1/")[1];
          return afterV1 + parsed.search;
        }
      } catch {
        // Not a valid URL, skip
      }
    }
  }
  return null;
}

async function canvasFetch<T>(
  path: string,
  client: CanvasClientOpts,
  opts?: FetchOpts
): Promise<FetchResult<T>> {
  const url = new URL(`/api/canvas/${path}`, window.location.origin);

  if (opts?.params) {
    for (const [key, value] of Object.entries(opts.params)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          url.searchParams.append(key, v);
        }
      } else {
        url.searchParams.set(key, value);
      }
    }
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${client.token}`,
        "X-Canvas-Base-URL": client.baseUrl,
      },
    });
  } catch {
    throw new CanvasNetworkError();
  }

  if (res.status === 401 || res.status === 403) {
    throw new CanvasAuthError();
  }

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") || "60", 10);
    throw new CanvasRateLimitError(retryAfter);
  }

  if (res.status === 502) {
    throw new CanvasNetworkError("Canvas server error");
  }

  if (!res.ok) {
    throw new CanvasNetworkError(`Canvas returned status ${res.status}`);
  }

  const rateLimitStr = res.headers.get("X-Rate-Limit-Remaining");
  const rateLimitRemaining = rateLimitStr ? parseFloat(rateLimitStr) : null;

  if (rateLimitRemaining !== null && rateLimitRemaining < 50) {
    console.warn(
      `[Nexus] Canvas rate limit low: ${rateLimitRemaining} remaining`
    );
  }

  const data = (await res.json()) as T;
  const nextPath = parseNextLink(res.headers.get("Link"));

  return { data, nextPath, rateLimitRemaining };
}

async function canvasFetchAll<T>(
  path: string,
  client: CanvasClientOpts,
  opts?: FetchOpts
): Promise<T[]> {
  const allItems: T[] = [];
  let currentPath = path;
  let currentOpts: FetchOpts | undefined = opts;

  while (true) {
    const result = await canvasFetch<T[]>(currentPath, client, currentOpts);
    allItems.push(...result.data);

    if (!result.nextPath) break;

    // After the first request, params are embedded in the nextPath URL
    currentPath = result.nextPath;
    currentOpts = undefined;
  }

  return allItems;
}

// ─── Public API ──────────────────────────────────────────────────────────

export async function fetchProfile(
  client: CanvasClientOpts
): Promise<{ id: number; name: string; short_name: string }> {
  const result = await canvasFetch<{
    id: number;
    name: string;
    short_name: string;
  }>("users/self", client);
  return result.data;
}

export async function fetchCourses(
  client: CanvasClientOpts
): Promise<CanvasCourse[]> {
  return canvasFetchAll<CanvasCourse>("courses", client, {
    params: { enrollment_state: "active", per_page: "50" },
  });
}

export async function fetchAssignments(
  client: CanvasClientOpts,
  courseId: number
): Promise<CanvasAssignment[]> {
  return canvasFetchAll<CanvasAssignment>(
    `courses/${courseId}/assignments`,
    client,
    {
      params: {
        bucket: "upcoming",
        order_by: "due_at",
        per_page: "50",
      },
    }
  );
}

export async function fetchCalendarEvents(
  client: CanvasClientOpts,
  startDate: string,
  endDate: string,
  courseIds: number[]
): Promise<CanvasCalendarEvent[]> {
  const contextCodes = courseIds.map((id) => `course_${id}`);
  return canvasFetchAll<CanvasCalendarEvent>("calendar_events", client, {
    params: {
      type: "event",
      start_date: startDate,
      end_date: endDate,
      per_page: "50",
      "context_codes[]": contextCodes,
    },
  });
}

export async function fetchAllUpcoming(
  client: CanvasClientOpts,
  courseIds: number[]
): Promise<{
  assignments: CanvasAssignment[];
  events: CanvasCalendarEvent[];
}> {
  const now = new Date();
  const startDate = now.toISOString().split("T")[0];
  const endDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [assignments, events] = await Promise.all([
    Promise.all(
      courseIds.map((id) => fetchAssignments(client, id))
    ).then((results) => results.flat()),
    fetchCalendarEvents(client, startDate, endDate, courseIds),
  ]);

  return { assignments, events };
}
