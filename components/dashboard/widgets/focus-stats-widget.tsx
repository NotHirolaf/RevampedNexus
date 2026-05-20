"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Timer, Flame, ArrowRight, Play, Pause } from "lucide-react";
import {
  usePomodoroStore,
  getCurrentRemaining,
  getDurationForMode,
} from "@/stores/usePomodoroStore";
import { useIsModuleEnabled } from "@/hooks/use-modules";
import { useMounted } from "@/hooks/use-hydration";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTime, getTodayString } from "@/lib/time-utils";

const MODE_META: Record<
  string,
  { label: string; accent: string; accentSoft: string }
> = {
  focus: {
    label: "Focus",
    accent: "#ef4444",
    accentSoft: "rgba(239,68,68,0.12)",
  },
  short_break: {
    label: "Short Break",
    accent: "#22c55e",
    accentSoft: "rgba(34,197,94,0.12)",
  },
  long_break: {
    label: "Long Break",
    accent: "#6366f1",
    accentSoft: "rgba(99,102,241,0.12)",
  },
  custom: {
    label: "Custom",
    accent: "#14b8a6",
    accentSoft: "rgba(20,184,166,0.12)",
  },
};

export function FocusStatsWidget() {
  const mounted = useMounted();
  const dailyLogs = usePomodoroStore((s) => s.dailyLogs);
  const sessions = usePomodoroStore((s) => s.sessions);
  const runtime = usePomodoroStore((s) => s.timerRuntime);
  const settings = usePomodoroStore((s) => s.settings);
  const startTimer = usePomodoroStore((s) => s.startTimer);
  const pauseTimer = usePomodoroStore((s) => s.pauseTimer);
  const enabled = useIsModuleEnabled("pomodoro");

  // Force re-render every 500ms while the timer is running so the countdown ticks.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!runtime.isRunning) return;
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [runtime.isRunning]);

  if (!enabled) return null;
  if (!mounted) {
    return <WidgetCard title="Focus" icon={Timer} />;
  }

  const today = getTodayString();
  const todayLog = dailyLogs.find((l) => l.date === today);

  const legacyTodayMins = sessions
    .filter(
      (s) =>
        s.type === "work" &&
        s.completed &&
        new Date(s.startedAt).toISOString().split("T")[0] === today
    )
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const legacyTodaySessions = sessions.filter(
    (s) =>
      s.type === "work" &&
      s.completed &&
      new Date(s.startedAt).toISOString().split("T")[0] === today
  ).length;

  const totalMinutes = (todayLog?.focusMinutes ?? 0) + legacyTodayMins;
  const totalSessions = (todayLog?.sessionsCompleted ?? 0) + legacyTodaySessions;

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeStr = `${hours}h ${mins}m`;

  const daysWithFocus = new Set(
    dailyLogs.filter((l) => l.sessionsCompleted > 0).map((l) => l.date)
  );
  for (const s of sessions) {
    if (s.type === "work" && s.completed) {
      daysWithFocus.add(new Date(s.startedAt).toISOString().split("T")[0]);
    }
  }
  let streak = 0;
  const d = new Date();
  while (true) {
    const ds = d.toISOString().split("T")[0];
    if (daysWithFocus.has(ds)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  // ── Active timer view: show live countdown when a session is in progress ──
  const remaining = getCurrentRemaining(runtime);
  const totalDur = getDurationForMode(
    runtime.mode,
    settings,
    runtime.customDuration
  );
  const isActive =
    runtime.isRunning || (!runtime.isRunning && remaining < totalDur);

  if (isActive) {
    const meta = MODE_META[runtime.mode] ?? MODE_META.focus;
    const progress = totalDur > 0 ? 1 - remaining / totalDur : 0;

    return (
      <WidgetCard title="Focus" icon={Timer} href="/pomodoro">
        <div
          className="rounded-xl px-3 py-3 space-y-2.5"
          style={{ backgroundColor: meta.accentSoft }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ color: meta.accent }}
            >
              {meta.label}
            </span>
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                runtime.isRunning ? "text-white" : "text-muted-foreground bg-muted"
              )}
              style={
                runtime.isRunning ? { backgroundColor: meta.accent } : undefined
              }
            >
              {runtime.isRunning ? "Running" : "Paused"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-3xl font-bold font-mono tabular-nums leading-none">
              {formatTime(remaining)}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (runtime.isRunning) pauseTimer();
                else startTimer();
              }}
              aria-label={runtime.isRunning ? "Pause" : "Resume"}
              className="flex items-center justify-center size-9 rounded-full text-white shadow-sm transition-transform active:scale-90"
              style={{ backgroundColor: meta.accent }}
            >
              {runtime.isRunning ? (
                <Pause className="size-4 fill-white" />
              ) : (
                <Play className="size-4 fill-white ml-0.5" />
              )}
            </button>
          </div>

          <div className="h-1.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, progress * 100))}%`,
                backgroundColor: meta.accent,
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
          <span>Today: {timeStr}</span>
          {streak > 0 && (
            <span className="flex items-center gap-1">
              <Flame className="size-3.5 text-orange-500" />
              {streak}d
            </span>
          )}
        </div>
      </WidgetCard>
    );
  }

  // ── Idle: original stats view ──
  if (totalSessions === 0 && streak === 0) {
    return (
      <WidgetCard title="Focus" icon={Timer}>
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <Timer className="size-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            Start a focus session
          </p>
          <Button variant="outline" size="sm" render={<Link href="/pomodoro" />}>
            Start Timer
            <ArrowRight className="size-4 ml-1" />
          </Button>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Focus" icon={Timer} href="/pomodoro">
      <div className="space-y-2">
        <p className="text-3xl font-bold tabular-nums">{timeStr}</p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            {totalSessions} session{totalSessions !== 1 ? "s" : ""}
          </span>
          {streak > 0 && (
            <span className="flex items-center gap-1">
              <Flame className="size-3.5 text-orange-500" />
              {streak} day streak
            </span>
          )}
        </div>
      </div>
    </WidgetCard>
  );
}
