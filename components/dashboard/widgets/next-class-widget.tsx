"use client";

import Link from "next/link";
import { CalendarDays, MapPin, Clock, ArrowRight } from "lucide-react";
import { useRealtimeClock } from "@/hooks/useRealtimeClock";
import { useTimetableStore } from "@/stores/useTimetableStore";
import { useIsModuleEnabled } from "@/hooks/use-modules";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TimetableEntry, DayOfWeek } from "@/types";

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatCountdown(diffMs: number): string {
  const totalSec = Math.max(0, Math.floor(diffMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getClassesForDay(
  entries: TimetableEntry[],
  day: DayOfWeek
): TimetableEntry[] {
  return entries
    .filter((e) => e.day === day)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

function getNextDay(day: DayOfWeek): DayOfWeek {
  return ((day + 1) % 7) as DayOfWeek;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function NextClassWidget() {
  const now = useRealtimeClock();
  const entries = useTimetableStore((s) => s.entries);
  const enabled = useIsModuleEnabled("timetable");

  if (!enabled) return null;

  const currentDay = now.getDay() as DayOfWeek;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayClasses = getClassesForDay(entries, currentDay);

  // Find current or next class
  let currentClass: TimetableEntry | null = null;
  let nextClass: TimetableEntry | null = null;

  for (const cls of todayClasses) {
    const start = timeToMinutes(cls.startTime);
    const end = timeToMinutes(cls.endTime);
    if (currentMinutes >= start && currentMinutes < end) {
      currentClass = cls;
      break;
    }
    if (currentMinutes < start) {
      nextClass = cls;
      break;
    }
  }

  // If no more classes today, look ahead
  let futureDay: DayOfWeek | null = null;
  let futureClass: TimetableEntry | null = null;
  if (!currentClass && !nextClass) {
    for (let i = 1; i <= 7; i++) {
      const checkDay = ((currentDay + i) % 7) as DayOfWeek;
      const dayClasses = getClassesForDay(entries, checkDay);
      if (dayClasses.length > 0) {
        futureDay = checkDay;
        futureClass = dayClasses[0];
        break;
      }
    }
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <WidgetCard
        title="Next Class"
        icon={CalendarDays}
        className="md:col-span-2"
      >
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CalendarDays className="size-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            Set up your timetable to see your next class
          </p>
          <Button variant="outline" size="sm" render={<Link href="/timetable" />}>
            Set Up Timetable
            <ArrowRight className="size-4 ml-1" />
          </Button>
        </div>
      </WidgetCard>
    );
  }

  // Currently in a class
  if (currentClass) {
    const startMin = timeToMinutes(currentClass.startTime);
    const endMin = timeToMinutes(currentClass.endTime);
    const totalDuration = endMin - startMin;
    const elapsed = currentMinutes - startMin;
    const progress = Math.min(1, elapsed / totalDuration);
    const remainingMs =
      (endMin - currentMinutes) * 60 * 1000 -
      (now.getSeconds() * 1000 + now.getMilliseconds());

    return (
      <WidgetCard
        title="Current Class"
        icon={CalendarDays}
        href="/timetable"
        className="md:col-span-2"
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {currentClass.color && (
                  <div
                    className="size-3 rounded-full shrink-0"
                    style={{ backgroundColor: currentClass.color }}
                  />
                )}
                <h4 className="font-semibold truncate">
                  {currentClass.courseName || currentClass.courseCode}
                </h4>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {currentClass.startTime} &ndash; {currentClass.endTime}
                </span>
                {currentClass.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {currentClass.location}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm text-muted-foreground">Ends in</p>
              <p className="text-lg font-mono font-semibold tabular-nums">
                {formatCountdown(remainingMs)}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            In progress &mdash; {Math.round(progress * 100)}% complete
          </p>
        </div>
      </WidgetCard>
    );
  }

  // Upcoming class today
  if (nextClass) {
    const startMin = timeToMinutes(nextClass.startTime);
    const diffMs =
      (startMin - currentMinutes) * 60 * 1000 -
      (now.getSeconds() * 1000 + now.getMilliseconds());
    const minutesAway = Math.ceil(diffMs / 60000);
    const isUrgent = minutesAway <= 5;
    const isWarning = minutesAway <= 15;

    return (
      <WidgetCard
        title="Next Class"
        icon={CalendarDays}
        href="/timetable"
        className="md:col-span-2"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {nextClass.color && (
                <div
                  className="size-3 rounded-full shrink-0"
                  style={{ backgroundColor: nextClass.color }}
                />
              )}
              <h4 className="font-semibold truncate">
                {nextClass.courseName || nextClass.courseCode}
              </h4>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {nextClass.startTime} &ndash; {nextClass.endTime}
              </span>
              {nextClass.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {nextClass.location}
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm text-muted-foreground">Starts in</p>
            <p
              className={cn(
                "text-xl font-mono font-semibold tabular-nums",
                isUrgent && "text-destructive animate-pulse",
                isWarning && !isUrgent && "text-amber-500"
              )}
            >
              {formatCountdown(diffMs)}
            </p>
          </div>
        </div>
      </WidgetCard>
    );
  }

  // No more classes today — show next future class
  if (futureClass && futureDay !== null) {
    const dayName =
      futureDay === getNextDay(currentDay)
        ? "Tomorrow"
        : DAY_NAMES[futureDay];

    return (
      <WidgetCard
        title="Next Class"
        icon={CalendarDays}
        href="/timetable"
        className="md:col-span-2"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {futureClass.color && (
                <div
                  className="size-3 rounded-full shrink-0"
                  style={{ backgroundColor: futureClass.color }}
                />
              )}
              <h4 className="font-semibold truncate">
                {futureClass.courseName || futureClass.courseCode}
              </h4>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {futureClass.startTime} &ndash; {futureClass.endTime}
              </span>
              {futureClass.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {futureClass.location}
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm text-muted-foreground">No more classes today</p>
            <p className="text-sm font-medium">
              {dayName} at {futureClass.startTime}
            </p>
          </div>
        </div>
      </WidgetCard>
    );
  }

  // No classes at all in timetable (but module is enabled)
  return (
    <WidgetCard
      title="Next Class"
      icon={CalendarDays}
      className="md:col-span-2"
    >
      <p className="text-sm text-muted-foreground py-2">
        No classes scheduled this week.
      </p>
    </WidgetCard>
  );
}
