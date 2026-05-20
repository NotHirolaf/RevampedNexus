import type { Habit } from "@/types";

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateString(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function getTodayString(): string {
  return toDateString(new Date());
}

export function isHabitScheduledOn(habit: Habit, date: Date): boolean {
  const dow = date.getDay(); // 0 = Sunday
  if (habit.frequency === "daily") return true;
  if (habit.frequency === "weekdays") return dow >= 1 && dow <= 5;
  if (habit.frequency === "custom") {
    return Array.isArray(habit.customDays) && habit.customDays.includes(dow);
  }
  return false;
}

export function frequencyLabel(habit: Habit): string {
  if (habit.frequency === "daily") return "Daily";
  if (habit.frequency === "weekdays") return "Weekdays";
  if (habit.frequency === "custom") {
    if (!habit.customDays || habit.customDays.length === 0) return "Custom";
    const NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return habit.customDays
      .slice()
      .sort((a, b) => a - b)
      .map((d) => NAMES[d])
      .join(" / ");
  }
  return "";
}

function shiftDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function currentStreak(habit: Habit, today: Date = new Date()): number {
  const completions = new Set(habit.completions);
  let streak = 0;
  let cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  let startedCounting = false;
  for (let i = 0; i < 730; i++) {
    const scheduled = isHabitScheduledOn(habit, cursor);
    const ds = toDateString(cursor);
    if (scheduled) {
      if (completions.has(ds)) {
        streak += 1;
        startedCounting = true;
      } else {
        if (!startedCounting && i === 0) {
          cursor = shiftDays(cursor, -1);
          continue;
        }
        break;
      }
    }
    cursor = shiftDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(habit: Habit): number {
  if (habit.completions.length === 0) return 0;
  const dates = habit.completions
    .map((s) => parseDateString(s))
    .sort((a, b) => a.getTime() - b.getTime());
  // Walk from earliest completion to latest, counting consecutive scheduled days
  // where the habit was either completed or not scheduled (skipped).
  const first = dates[0];
  const last = dates[dates.length - 1];
  const completions = new Set(habit.completions);
  let longest = 0;
  let current = 0;
  let cursor = new Date(first);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(last);
  end.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= end.getTime()) {
    const scheduled = isHabitScheduledOn(habit, cursor);
    if (scheduled) {
      if (completions.has(toDateString(cursor))) {
        current += 1;
        if (current > longest) longest = current;
      } else {
        current = 0;
      }
    }
    cursor = shiftDays(cursor, 1);
  }
  return longest;
}

export const HABIT_COLOR_PALETTE = [
  "#6366f1", // indigo
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#a855f7", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#eab308", // yellow
  "#3b82f6", // blue
];

export const HABIT_EMOJIS = [
  "📚", "🏃", "💧", "✍️", "🧘", "💤", "🥗", "🎯", "📖", "💪",
  "🚴", "🏊", "🌱", "☀️", "🌙", "🎨", "🎵", "💻", "🧠", "❤️",
  "🍎", "☕", "🚶", "🛏️", "🧹", "📝", "🙏", "🌳", "📱", "✨",
  "🔥", "⭐", "🎓", "🧪", "🥤", "🍵", "💊", "🪥", "🚿", "🧴",
];
