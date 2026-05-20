import type { TimetableEntry, TimetableCategory, DayOfWeek } from "@/types";

// ─── Category colors ──────────────────────────────────────────────────────

export const CATEGORY_COLORS: Record<TimetableCategory, string> = {
  class: "#3b82f6",
  study: "#22c55e",
  break: "#eab308",
  personal: "#a855f7",
  other: "#6b7280",
};

export const CATEGORY_LABELS: Record<TimetableCategory, string> = {
  class: "Class",
  study: "Study Session",
  break: "Break",
  personal: "Personal",
  other: "Other",
};

// ─── Time helpers ─────────────────────────────────────────────────────────

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(mins: number): string {
  const m = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}

export function snapToSlot(mins: number, slot = 30): number {
  return Math.round(mins / slot) * slot;
}

// ─── .ics parser (lightweight) ────────────────────────────────────────────

interface RawEvent {
  summary?: string;
  description?: string;
  location?: string;
  dtstart?: string;
  dtend?: string;
  rrule?: string;
  allDay?: boolean;
  dtstartTzid?: string;
}

function unfoldLines(text: string): string[] {
  const raw = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function parseIcsDate(
  value: string,
  allDay: boolean
): Date | null {
  // Examples:
  //  20250414T140000Z
  //  20250414T140000
  //  20250414
  if (!value) return null;
  const clean = value.replace(/-/g, "").replace(/:/g, "");
  if (allDay || /^\d{8}$/.test(clean)) {
    const y = Number(clean.slice(0, 4));
    const m = Number(clean.slice(4, 6)) - 1;
    const d = Number(clean.slice(6, 8));
    return new Date(y, m, d);
  }
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(clean);
  if (!match) return null;
  const [, y, mo, d, h, mi, s, z] = match;
  if (z === "Z") {
    return new Date(
      Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)
    );
  }
  return new Date(+y, +mo - 1, +d, +h, +mi, +s);
}

const DAY_MAP: Record<string, DayOfWeek> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
};

function extractDays(ev: RawEvent): DayOfWeek[] {
  if (ev.rrule) {
    const byday = /BYDAY=([^;]+)/i.exec(ev.rrule);
    if (byday) {
      return byday[1]
        .split(",")
        .map((t) => DAY_MAP[t.trim().slice(-2).toUpperCase()])
        .filter((d): d is DayOfWeek => d !== undefined);
    }
  }
  if (ev.dtstart) {
    const d = parseIcsDate(ev.dtstart, ev.allDay ?? false);
    if (d) return [d.getDay() as DayOfWeek];
  }
  return [];
}

export interface IcsParseResult {
  entries: TimetableEntry[];
  skipped: number;
  errors: string[];
}

export function parseIcs(text: string): IcsParseResult {
  const errors: string[] = [];
  let skipped = 0;
  const entries: TimetableEntry[] = [];

  if (!text || !text.includes("BEGIN:VCALENDAR")) {
    return {
      entries: [],
      skipped: 0,
      errors: ["Not a valid iCalendar file"],
    };
  }

  const lines = unfoldLines(text);
  let cur: RawEvent | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur) {
        try {
          const built = buildEntries(cur);
          if (built.length === 0) skipped++;
          else entries.push(...built);
        } catch (err) {
          errors.push(String(err));
          skipped++;
        }
      }
      cur = null;
      continue;
    }
    if (!cur) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const keyPart = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1);
    const keyUp = keyPart.toUpperCase();

    if (keyUp.startsWith("SUMMARY")) cur.summary = unescapeIcs(value);
    else if (keyUp.startsWith("DESCRIPTION")) cur.description = unescapeIcs(value);
    else if (keyUp.startsWith("LOCATION")) cur.location = unescapeIcs(value);
    else if (keyUp.startsWith("DTSTART")) {
      cur.dtstart = value;
      if (keyUp.includes("VALUE=DATE") && !keyUp.includes("DATE-TIME")) {
        cur.allDay = true;
      }
    } else if (keyUp.startsWith("DTEND")) {
      cur.dtend = value;
    } else if (keyUp.startsWith("RRULE")) {
      cur.rrule = value;
    }
  }

  return { entries, skipped, errors };
}

function unescapeIcs(s: string): string {
  return s
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function buildEntries(ev: RawEvent): TimetableEntry[] {
  if (!ev.dtstart) return [];
  const start = parseIcsDate(ev.dtstart, ev.allDay ?? false);
  const end = ev.dtend ? parseIcsDate(ev.dtend, ev.allDay ?? false) : null;
  if (!start) return [];

  // All-day events: skip — they don't fit the timed grid
  if (ev.allDay) return [];

  // Multi-day: cap to same-day by truncating at midnight
  let endDate = end ?? new Date(start.getTime() + 60 * 60 * 1000);
  if (
    endDate.getFullYear() !== start.getFullYear() ||
    endDate.getMonth() !== start.getMonth() ||
    endDate.getDate() !== start.getDate()
  ) {
    endDate = new Date(start);
    endDate.setHours(23, 59, 0, 0);
  }

  const startHHMM = `${pad2(start.getHours())}:${pad2(start.getMinutes())}`;
  const endHHMM = `${pad2(endDate.getHours())}:${pad2(endDate.getMinutes())}`;

  const days = extractDays(ev);
  if (days.length === 0) return [];

  const title = (ev.summary || "Untitled").trim();
  const category = guessCategory(title);
  const color = CATEGORY_COLORS[category];
  const location = ev.location?.trim();
  const notesParts: string[] = [];
  if (location) notesParts.push(location);
  if (ev.description) notesParts.push(ev.description.trim());

  return days.map((day) => ({
    id: crypto.randomUUID(),
    title,
    category,
    day,
    startTime: startHHMM,
    endTime: endHHMM,
    color,
    notes: notesParts.join("\n\n") || undefined,
    location,
  }));
}

function guessCategory(title: string): TimetableCategory {
  const t = title.toLowerCase();
  if (/(lecture|lab|tutorial|seminar|class|course|\bcs\b|\bmath\b)/.test(t))
    return "class";
  if (/study|review|revision/.test(t)) return "study";
  if (/break|lunch|dinner|rest/.test(t)) return "break";
  return "personal";
}

// ─── .ics export ──────────────────────────────────────────────────────────

function fmtIcsLocal(d: Date): string {
  return (
    `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}${pad2(d.getMinutes())}00`
  );
}

const DAY_CODES: Record<DayOfWeek, string> = {
  0: "SU", 1: "MO", 2: "TU", 3: "WE", 4: "TH", 5: "FR", 6: "SA",
};

export function exportIcs(
  entries: TimetableEntry[],
  weekStart: Date
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nexus//Timetable//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const e of entries) {
    const date = new Date(weekStart);
    const offset = (e.day === 0 ? 6 : e.day - 1); // Monday-based
    date.setDate(date.getDate() + offset);
    const [sh, sm] = e.startTime.split(":").map(Number);
    const [eh, em] = e.endTime.split(":").map(Number);
    const start = new Date(date);
    start.setHours(sh, sm, 0, 0);
    const end = new Date(date);
    end.setHours(eh, em, 0, 0);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@nexus`,
      `DTSTAMP:${fmtIcsLocal(new Date())}`,
      `DTSTART:${fmtIcsLocal(start)}`,
      `DTEND:${fmtIcsLocal(end)}`,
      `SUMMARY:${icsEscape(e.title)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${DAY_CODES[e.day]}`,
      `CATEGORIES:${CATEGORY_LABELS[e.category]}`,
    );
    if (e.notes) lines.push(`DESCRIPTION:${icsEscape(e.notes)}`);
    if (e.location) lines.push(`LOCATION:${icsEscape(e.location)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function icsEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// ─── Week / overlap helpers ───────────────────────────────────────────────

export function getWeekStart(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay(); // 0=Sun..6=Sat
  const offset = day === 0 ? -6 : 1 - day; // shift to Monday
  date.setDate(date.getDate() + offset);
  return date;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function overlaps(
  a: { startTime: string; endTime: string; day: DayOfWeek; id?: string },
  b: { startTime: string; endTime: string; day: DayOfWeek; id?: string }
): boolean {
  if (a.day !== b.day) return false;
  if (a.id && b.id && a.id === b.id) return false;
  const aStart = toMinutes(a.startTime);
  const aEnd = toMinutes(a.endTime);
  const bStart = toMinutes(b.startTime);
  const bEnd = toMinutes(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}
