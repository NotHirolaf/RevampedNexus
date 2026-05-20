"use client";

import Link from "next/link";
import {
  CalendarClock,
  ArrowRight,
  CheckSquare,
  CalendarDays,
} from "lucide-react";
import { useRealtimeClock } from "@/hooks/useRealtimeClock";
import { useTodoStore } from "@/stores/useTodoStore";
import { useEventStore } from "@/stores/useEventStore";
import { useGradeStore } from "@/stores/useGradeStore";
import { useCanvasStore } from "@/stores/useCanvasStore";
import { useIsModuleEnabled } from "@/hooks/use-modules";
import { useModuleStore } from "@/stores/module-store";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { CanvasBadge } from "@/components/ui/canvas-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DeadlineItem {
  id: string;
  title: string;
  dueDate: Date;
  isCanvas: boolean;
  type: "todo" | "event";
  isOverdue: boolean;
  courseName?: string | null;
  courseColor?: string | null;
}

function formatRelativeTime(now: Date, target: Date): string {
  const diffMs = target.getTime() - now.getTime();
  const absDiffMs = Math.abs(diffMs);
  const isOverdue = diffMs < 0;

  const minutes = Math.floor(absDiffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let label: string;
  if (days > 0) {
    label = days === 1 ? "1 day" : `${days} days`;
  } else if (hours > 0) {
    const remMin = minutes % 60;
    label = remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
  } else {
    label = `${minutes}m`;
  }

  return isOverdue ? `overdue by ${label}` : `in ${label}`;
}

export function UpcomingDeadlinesWidget() {
  const now = useRealtimeClock();
  const todos = useTodoStore((s) => s.items);
  const events = useEventStore((s) => s.items);
  const gradeCourses = useGradeStore((s) => s.courses);
  const canvasCourses = useCanvasStore((s) => s.courses);
  const gradesEnabled = useModuleStore(
    (s) => s.enabledModules["grades"] ?? false
  );
  const todosEnabled = useIsModuleEnabled("todos");
  const eventsEnabled = useIsModuleEnabled("events");

  if (!todosEnabled && !eventsEnabled) return null;

  // Build a course lookup so we can show course tag badges.
  const courseLookup = new Map<string, { name: string; color: string }>();
  if (gradesEnabled) {
    for (const c of gradeCourses) {
      courseLookup.set(c.id, { name: c.name, color: c.color });
    }
  }
  for (const c of canvasCourses) {
    courseLookup.set(`canvas:${c.id}`, {
      name: c.course_code || c.name,
      color: "#6366f1",
    });
  }

  const items: DeadlineItem[] = [];

  if (todosEnabled) {
    for (const todo of todos) {
      if (todo.status === "completed" || !todo.dueDate) continue;
      if (todo.removedFromCanvas) continue;
      const due = new Date(todo.dueDate);
      const courseKey =
        todo.source === "canvas" && todo.canvasCourseId != null
          ? `canvas:${todo.canvasCourseId}`
          : todo.courseId;
      const course = courseKey ? courseLookup.get(courseKey) : null;
      items.push({
        id: `todo-${todo.id}`,
        title: todo.title,
        dueDate: due,
        isCanvas: todo.source === "canvas",
        type: "todo",
        isOverdue: due.getTime() < now.getTime(),
        courseName: course?.name ?? null,
        courseColor: course?.color ?? null,
      });
    }
  }

  if (eventsEnabled) {
    for (const ev of events) {
      if (ev.cancelledOnCanvas) continue;
      const eventDate = new Date(ev.time ? `${ev.date}T${ev.time}` : ev.date);
      // Hide events that are clearly in the past (more than a day old)
      if (eventDate.getTime() < now.getTime() - 24 * 60 * 60 * 1000) continue;
      const courseKey =
        ev.source === "canvas" && ev.canvasCourseId != null
          ? `canvas:${ev.canvasCourseId}`
          : ev.courseId;
      const course = courseKey ? courseLookup.get(courseKey) : null;
      const courseName =
        course?.name ?? (ev.courseTag ? ev.courseTag : null);
      const courseColor = course?.color ?? null;
      items.push({
        id: `event-${ev.id}`,
        title: ev.title,
        dueDate: eventDate,
        isCanvas: ev.source === "canvas",
        type: "event",
        isOverdue: eventDate.getTime() < now.getTime(),
        courseName,
        courseColor,
      });
    }
  }

  // Sort: overdue first (most overdue at top), then upcoming ascending.
  items.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  const display = items.slice(0, 5);

  return (
    <WidgetCard title="Upcoming Deadlines" icon={CalendarClock} href="/todos">
      {display.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <CalendarClock className="size-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            No upcoming deadlines
          </p>
          <Button variant="outline" size="sm" render={<Link href="/todos" />}>
            Add a Task
            <ArrowRight className="size-4 ml-1" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {display.map((item) => {
            const SourceIcon = item.type === "todo" ? CheckSquare : CalendarDays;
            const hoursUntil =
              (item.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
            const isUrgent = item.isOverdue || hoursUntil < 24;
            const isWarning = hoursUntil < 72;

            return (
              <div
                key={item.id}
                className="flex items-center gap-2 text-sm"
              >
                <div
                  className={cn(
                    "w-1 self-stretch rounded-full shrink-0",
                    item.isOverdue
                      ? "bg-destructive"
                      : isUrgent
                        ? "bg-destructive/70"
                        : isWarning
                          ? "bg-amber-500"
                          : "bg-muted-foreground/30"
                  )}
                />
                <SourceIcon
                  className={cn(
                    "size-3.5 shrink-0",
                    item.isOverdue
                      ? "text-destructive"
                      : "text-muted-foreground"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate font-medium",
                      item.isOverdue && "text-destructive"
                    )}
                  >
                    {item.title}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.courseName && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: item.courseColor
                          ? `${item.courseColor}1f`
                          : undefined,
                        color: item.courseColor ?? undefined,
                      }}
                    >
                      {item.courseColor && (
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: item.courseColor }}
                        />
                      )}
                      {item.courseName}
                    </span>
                  )}
                  {item.isCanvas && <CanvasBadge />}
                  <span
                    className={cn(
                      "text-xs whitespace-nowrap",
                      item.isOverdue
                        ? "text-destructive font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {formatRelativeTime(now, item.dueDate)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetCard>
  );
}
