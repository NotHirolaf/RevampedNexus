"use client";

import Link from "next/link";
import { Activity, ArrowRight, Flame } from "lucide-react";
import { useHabitStore } from "@/stores/useHabitStore";
import { useIsModuleEnabled } from "@/hooks/use-modules";
import { useMounted } from "@/hooks/use-hydration";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  currentStreak,
  getTodayString,
  isHabitScheduledOn,
} from "@/components/modules/habits/habit-utils";

export function HabitStreakWidget() {
  const mounted = useMounted();
  const habits = useHabitStore((s) => s.habits);
  const toggleCompletion = useHabitStore((s) => s.toggleCompletion);
  const enabled = useIsModuleEnabled("habits");

  if (!enabled) return null;
  if (!mounted) {
    return (
      <WidgetCard title="Habits" icon={Activity}>
        <div className="h-20" />
      </WidgetCard>
    );
  }

  const today = getTodayString();
  const todayDate = new Date();

  const sorted = [...habits].sort((a, b) => a.order - b.order);
  const scheduledToday = sorted.filter((h) => isHabitScheduledOn(h, todayDate));
  const completedToday = scheduledToday.filter((h) =>
    h.completions.includes(today)
  ).length;
  const total = scheduledToday.length;
  const progress = total === 0 ? 0 : (completedToday / total) * 100;
  const topThree = scheduledToday.slice(0, 3);

  if (habits.length === 0) {
    return (
      <WidgetCard title="Habits" icon={Activity}>
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <Activity className="size-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            Build your first habit
          </p>
          <Button variant="outline" size="sm" render={<Link href="/habits" />}>
            Add Habit
            <ArrowRight className="size-4 ml-1" />
          </Button>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      title="Habits"
      icon={Activity}
      action={
        <Link
          href="/habits"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
        >
          See all
          <ArrowRight className="size-3" />
        </Link>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-semibold">
              {completedToday}
            </span>{" "}
            of {total} done today
          </p>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {topThree.length > 0 && (
          <div className="space-y-1.5">
            {topThree.map((habit) => {
              const done = habit.completions.includes(today);
              const streak = currentStreak(habit);
              return (
                <div
                  key={habit.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleCompletion(habit.id, today);
                    }}
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border-2 transition-all shrink-0",
                      done ? "text-white" : "border-input bg-background text-transparent hover:border-ring"
                    )}
                    style={
                      done
                        ? {
                            backgroundColor: habit.color,
                            borderColor: habit.color,
                          }
                        : undefined
                    }
                    aria-label={done ? "Mark incomplete" : "Mark complete"}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-3"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                  <span className="text-base shrink-0">{habit.icon || "✨"}</span>
                  <span
                    className={cn(
                      "flex-1 truncate",
                      done && "line-through text-muted-foreground"
                    )}
                  >
                    {habit.name}
                  </span>
                  {streak > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400 font-medium shrink-0">
                      <Flame className="size-3" />
                      {streak}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {scheduledToday.length === 0 && habits.length > 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            No habits scheduled for today.
          </p>
        )}
      </div>
    </WidgetCard>
  );
}
