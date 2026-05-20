"use client";

import { CalendarDays, Check, MapPin } from "lucide-react";
import { useRealtimeClock } from "@/hooks/useRealtimeClock";
import { useTimetableStore } from "@/stores/useTimetableStore";
import { useIsModuleEnabled } from "@/hooks/use-modules";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { cn } from "@/lib/utils";
import type { DayOfWeek } from "@/types";

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function TodayScheduleWidget() {
  const now = useRealtimeClock();
  const entries = useTimetableStore((s) => s.entries);
  const enabled = useIsModuleEnabled("timetable");

  if (!enabled) return null;

  const currentDay = now.getDay() as DayOfWeek;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todayClasses = entries
    .filter((e) => e.day === currentDay)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  if (todayClasses.length === 0) {
    return (
      <WidgetCard title="Today's Schedule" icon={CalendarDays} href="/timetable">
        <p className="text-sm text-muted-foreground py-2">
          No classes today
        </p>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Today's Schedule" icon={CalendarDays} href="/timetable">
      <div className="space-y-1">
        {todayClasses.map((cls) => {
          const startMin = timeToMinutes(cls.startTime);
          const endMin = timeToMinutes(cls.endTime);
          const isPast = currentMinutes >= endMin;
          const isCurrent =
            currentMinutes >= startMin && currentMinutes < endMin;

          return (
            <div
              key={cls.id}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors",
                isPast && "opacity-50",
                isCurrent && "bg-primary/5"
              )}
            >
              <div
                className="w-1 self-stretch rounded-full shrink-0"
                style={{
                  backgroundColor: isPast
                    ? "var(--color-muted-foreground)"
                    : cls.color || "var(--color-primary)",
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {cls.courseName || cls.courseCode}
                  </span>
                  {isPast && <Check className="size-3.5 text-muted-foreground shrink-0" />}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {cls.startTime} &ndash; {cls.endTime}
                  </span>
                  {cls.location && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="size-3" />
                      {cls.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
}
