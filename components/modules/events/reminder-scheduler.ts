/**
 * Schedules browser notifications for upcoming events using `setTimeout`.
 *
 * NOTE: Without a service worker, reminders only fire while this tab is open.
 * A future enhancement could move scheduling into a service worker so
 * notifications persist when the app is closed.
 */
import type { StoredEvent } from "@/stores/useEventStore";

type AnyEvent = Pick<
  StoredEvent,
  "id" | "title" | "date" | "time" | "reminder" | "type" | "cancelledOnCanvas"
>;

const scheduled = new Map<string, ReturnType<typeof setTimeout>>();
const fired = new Set<string>();

function eventDateTime(ev: AnyEvent): Date | null {
  if (!ev.date) return null;
  if (ev.time) return new Date(`${ev.date}T${ev.time}`);
  return new Date(`${ev.date}T09:00`);
}

export function clearAllScheduledReminders() {
  for (const t of scheduled.values()) clearTimeout(t);
  scheduled.clear();
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function scheduleReminders(events: AnyEvent[]) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  clearAllScheduledReminders();

  const now = Date.now();
  for (const ev of events) {
    if (ev.cancelledOnCanvas) continue;
    if (ev.reminder == null) continue;
    const dt = eventDateTime(ev);
    if (!dt) continue;
    const fireAt = dt.getTime() - ev.reminder * 60_000;
    if (fireAt <= now) continue;
    if (fired.has(ev.id)) continue;

    const delay = fireAt - now;
    // setTimeout has a 32-bit max delay (~24.8 days). Skip anything further out.
    if (delay > 2 ** 31 - 1) continue;

    const handle = setTimeout(() => {
      if (Notification.permission !== "granted") return;
      try {
        new Notification(ev.title, {
          body: formatReminderBody(ev, dt),
          tag: `nexus-event-${ev.id}`,
        });
        fired.add(ev.id);
      } catch {
        // ignore
      }
    }, delay);
    scheduled.set(ev.id, handle);
  }
}

function formatReminderBody(ev: AnyEvent, dt: Date): string {
  const dateLabel = dt.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: ev.time ? "numeric" : undefined,
    minute: ev.time ? "2-digit" : undefined,
  });
  return `${capitalize(ev.type)} · ${dateLabel}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
