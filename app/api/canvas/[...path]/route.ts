import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// Hardcoded allowlist of known university Canvas domains (non-.instructure.com)
const KNOWN_CANVAS_DOMAINS = new Set([
  "q.utoronto.ca",
  "canvas.ubc.ca",
  "canvas.ox.ac.uk",
  "canvas.harvard.edu",
  "canvas.mit.edu",
  "canvas.stanford.edu",
  "canvas.yale.edu",
  "canvas.mcgill.ca",
  "canvas.nus.edu.sg",
  "canvas.sydney.edu.au",
]);

function isAllowedBaseUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (host.endsWith(".instructure.com")) return true;
    if (KNOWN_CANVAS_DOMAINS.has(host)) return true;
    return false;
  } catch {
    return false;
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, X-Canvas-Base-URL, Content-Type",
    "Access-Control-Expose-Headers": "X-Rate-Limit-Remaining, Link",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

async function handleProxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const auth = req.headers.get("Authorization");
  const baseUrl = req.headers.get("X-Canvas-Base-URL");

  if (!auth || !baseUrl) {
    return NextResponse.json(
      {
        error: "Missing required headers",
        details: !auth
          ? "Authorization header is required"
          : "X-Canvas-Base-URL header is required",
      },
      { status: 400, headers: corsHeaders() }
    );
  }

  if (!isAllowedBaseUrl(baseUrl)) {
    return NextResponse.json(
      {
        error: "Invalid Canvas base URL",
        details:
          "URL must end in .instructure.com or be a known university Canvas domain",
      },
      { status: 400, headers: corsHeaders() }
    );
  }

  // Build target URL
  const pathSegment = path.join("/");
  const targetUrl = new URL(`/api/v1/${pathSegment}`, baseUrl);

  // Forward query params from the original request
  const { searchParams } = new URL(req.url);
  searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  try {
    const fetchInit: RequestInit = {
      method: req.method,
      headers: {
        Authorization: auth,
        Accept: "application/json",
      },
    };

    // Forward body for POST/PUT
    if (req.method === "POST" || req.method === "PUT") {
      fetchInit.body = await req.text();
      (fetchInit.headers as Record<string, string>)["Content-Type"] =
        req.headers.get("Content-Type") || "application/json";
    }

    const canvasRes = await fetch(targetUrl.toString(), fetchInit);

    // Map Canvas error responses
    if (canvasRes.status === 401 || canvasRes.status === 403) {
      return NextResponse.json(
        { error: "Canvas authentication failed. Check your access token." },
        { status: 401, headers: corsHeaders() }
      );
    }

    if (canvasRes.status === 429) {
      const retryAfter = canvasRes.headers.get("Retry-After");
      const headers: Record<string, string> = { ...corsHeaders() };
      if (retryAfter) headers["Retry-After"] = retryAfter;
      return NextResponse.json(
        { error: "Canvas rate limit exceeded. Please try again later." },
        { status: 429, headers }
      );
    }

    if (canvasRes.status >= 500) {
      return NextResponse.json(
        { error: "Canvas server error. Please try again later." },
        { status: 502, headers: corsHeaders() }
      );
    }

    // Success — forward the response
    const body = await canvasRes.text();
    const resHeaders: Record<string, string> = { ...corsHeaders() };

    const contentType = canvasRes.headers.get("Content-Type");
    if (contentType) resHeaders["Content-Type"] = contentType;

    const linkHeader = canvasRes.headers.get("Link");
    if (linkHeader) resHeaders["Link"] = linkHeader;

    const rateLimit = canvasRes.headers.get("X-Rate-Limit-Remaining");
    if (rateLimit) resHeaders["X-Rate-Limit-Remaining"] = rateLimit;

    return new NextResponse(body, {
      status: canvasRes.status,
      headers: resHeaders,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to Canvas. Check your institution URL." },
      { status: 502, headers: corsHeaders() }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
