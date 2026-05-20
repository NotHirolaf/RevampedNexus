"use client";

import Link from "next/link";
import { CheckSquare, ArrowRight, CheckCircle2 } from "lucide-react";
import { useTodoStore } from "@/stores/useTodoStore";
import { useIsModuleEnabled } from "@/hooks/use-modules";
import { useMounted } from "@/hooks/use-hydration";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { CanvasBadge } from "@/components/ui/canvas-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getTodayString } from "@/lib/time-utils";

export function ActiveTasksWidget() {
  const mounted = useMounted();
  const items = useTodoStore((s) => s.items);
  const updateTodo = useTodoStore((s) => s.updateTodo);
  const enabled = useIsModuleEnabled("todos");

  if (!enabled) return null;
  if (!mounted) {
    return <WidgetCard title="Tasks" icon={CheckSquare} />;
  }

  const visible = items.filter((t) => !t.removedFromCanvas);
  const today = getTodayString();

  const completedToday = visible.filter(
    (t) =>
      t.status === "completed" &&
      t.completedAt &&
      t.completedAt.startsWith(today)
  ).length;
  const pending = visible.filter((t) => t.status !== "completed");
  const totalToday = completedToday + pending.length;
  const progress = totalToday > 0 ? completedToday / totalToday : 0;

  // Circular progress ring
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  function handleToggle(id: string) {
    updateTodo(id, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
  }

  // Empty state
  if (visible.length === 0) {
    return (
      <WidgetCard title="Tasks" icon={CheckSquare}>
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <CheckSquare className="size-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            Add your first task
          </p>
          <Button variant="outline" size="sm" render={<Link href="/todos" />}>
            Go to Tasks
            <ArrowRight className="size-4 ml-1" />
          </Button>
        </div>
      </WidgetCard>
    );
  }

  // All complete (no pending remaining)
  if (pending.length === 0) {
    return (
      <WidgetCard title="Tasks" icon={CheckSquare} href="/todos">
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <CheckCircle2 className="size-8 text-primary mb-2" />
          <p className="text-sm font-medium">All caught up!</p>
          <p className="text-xs text-muted-foreground">
            {completedToday} task{completedToday !== 1 ? "s" : ""} completed today
          </p>
        </div>
      </WidgetCard>
    );
  }

  const displayTasks = pending
    .sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const pa = priorityOrder[a.priority] ?? 4;
      const pb = priorityOrder[b.priority] ?? 4;
      if (pa !== pb) return pa - pb;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    })
    .slice(0, 4);

  return (
    <WidgetCard title="Tasks" icon={CheckSquare} href="/todos">
      <div className="space-y-3">
        {/* Progress ring + count */}
        <div className="flex items-center gap-3">
          <svg width="64" height="64" className="shrink-0 -rotate-90">
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-muted"
            />
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="text-primary transition-all duration-500"
            />
          </svg>
          <div>
            <p className="text-lg font-semibold">
              {completedToday} / {totalToday}
            </p>
            <p className="text-xs text-muted-foreground">completed today</p>
          </div>
        </div>

        {/* Task list */}
        <div className="space-y-1.5">
          {displayTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={false}
                onCheckedChange={() => handleToggle(task.id)}
                className="shrink-0"
              />
              <span className="truncate flex-1">{task.title}</span>
              {task.source === "canvas" && <CanvasBadge />}
            </div>
          ))}
        </div>
      </div>
    </WidgetCard>
  );
}
