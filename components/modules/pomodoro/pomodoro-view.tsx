"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Settings as SettingsIcon,
  Flame,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModuleGuard } from "@/components/modules/module-guard";
import { useMounted } from "@/hooks/use-hydration";
import {
  usePomodoroStore,
  getDurationForMode,
  getCurrentRemaining,
  type TimerMode,
} from "@/stores/usePomodoroStore";
import { useTodoStore } from "@/stores/useTodoStore";
import { useGradeStore } from "@/stores/useGradeStore";
import { useModuleStore } from "@/stores/module-store";
import { cn } from "@/lib/utils";
import { formatTime, getTodayString } from "@/lib/time-utils";

// ─── Types & constants ────────────────────────────────────────────────────────

interface ModeConfig {
  label: string;
  accent: string;
  accentSoft: string;
  trackOpacity: string;
}

const MODES: Record<TimerMode, ModeConfig> = {
  focus: {
    label: "Focus",
    accent: "#ef4444",
    accentSoft: "rgba(239,68,68,0.07)",
    trackOpacity: "rgba(239,68,68,0.15)",
  },
  short_break: {
    label: "Short Break",
    accent: "#22c55e",
    accentSoft: "rgba(34,197,94,0.07)",
    trackOpacity: "rgba(34,197,94,0.15)",
  },
  long_break: {
    label: "Long Break",
    accent: "#6366f1",
    accentSoft: "rgba(99,102,241,0.07)",
    trackOpacity: "rgba(99,102,241,0.15)",
  },
  custom: {
    label: "Custom",
    accent: "#14b8a6",
    accentSoft: "rgba(20,184,166,0.07)",
    trackOpacity: "rgba(20,184,166,0.15)",
  },
};

// ─── Timer ring (SVG) ─────────────────────────────────────────────────────────

function TimerRing({
  total,
  remaining,
  accent,
  trackOpacity,
  isRunning,
}: {
  total: number;
  remaining: number;
  accent: string;
  trackOpacity: string;
  isRunning: boolean;
}) {
  const size = 270;
  const cx = size / 2;
  const r = 112;
  const circumference = 2 * Math.PI * r;
  const progress = total > 0 ? remaining / total : 1;
  const offset = circumference * (1 - progress);

  return (
    <svg
      width={size}
      height={size}
      className="-rotate-90"
      style={{
        filter: isRunning ? `drop-shadow(0 0 12px ${accent}55)` : "none",
        transition: "filter 0.6s ease",
      }}
    >
      <circle
        cx={cx}
        cy={cx}
        r={r + 10}
        fill="none"
        stroke={accent}
        strokeWidth="1"
        opacity="0.1"
      />
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke={trackOpacity}
        strokeWidth="9"
      />
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke={accent}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
      />
    </svg>
  );
}

// ─── Mode selector pills ──────────────────────────────────────────────────────

function ModePills({
  current,
  onChange,
  workMin,
  shortMin,
  longMin,
  customDurationSec,
}: {
  current: TimerMode;
  onChange: (m: TimerMode) => void;
  workMin: number;
  shortMin: number;
  longMin: number;
  customDurationSec: number;
}) {
  const pills: { id: TimerMode; label: string; dur: number }[] = [
    { id: "focus", label: "Focus", dur: workMin },
    { id: "short_break", label: "Short", dur: shortMin },
    { id: "long_break", label: "Long", dur: longMin },
    { id: "custom", label: "Custom", dur: Math.round(customDurationSec / 60) },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/50 w-fit mx-auto">
      {pills.map(({ id, label, dur }) => {
        const isActive = current === id;
        const cfg = MODES[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-medium transition-all select-none",
              isActive
                ? "text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
            style={isActive ? { backgroundColor: cfg.accent } : undefined}
          >
            {label}
            <span
              className={cn(
                "ml-1.5 text-xs tabular-nums",
                isActive ? "opacity-70" : "opacity-50"
              )}
            >
              {dur}m
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Session dots ─────────────────────────────────────────────────────────────

function SessionDots({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={{
            scale: i < completed ? 1 : 0.6,
            opacity: i < completed ? 1 : 0.3,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
          className="size-2.5 rounded-full"
          style={{
            backgroundColor:
              i < completed ? MODES.focus.accent : "currentColor",
          }}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground tabular-nums">
        {completed}/{total}
      </span>
    </div>
  );
}

// ─── Studying selector ────────────────────────────────────────────────────────

function StudyingSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const todosEnabled = useModuleStore(
    (s) => s.enabledModules["todos"] ?? false
  );
  const gradesEnabled = useModuleStore(
    (s) => s.enabledModules["grades"] ?? false
  );
  const todos = useTodoStore((s) => s.items);
  const courses = useGradeStore((s) => s.courses);

  if (!todosEnabled && !gradesEnabled) return null;
  const activeTodos = todos
    .filter((t) => t.status !== "completed")
    .slice(0, 20);
  if (activeTodos.length === 0 && courses.length === 0) return null;

  const label = (() => {
    if (!value || value === "__none__") return null;
    if (value.startsWith("todo:")) {
      return todos.find((x) => x.id === value.slice(5))?.title ?? null;
    }
    if (value.startsWith("course:")) {
      const c = courses.find((x) => x.id === value.slice(7));
      return c?.name ?? null;
    }
    return null;
  })();

  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger
        size="sm"
        className="rounded-full border-dashed max-w-[220px] text-xs"
      >
        <SelectValue>
          {label ? (
            <span className="truncate">{label}</span>
          ) : (
            <span className="text-muted-foreground">What are you studying?</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">Nothing specific</SelectItem>
        {gradesEnabled &&
          courses.map((c) => (
            <SelectItem key={`c:${c.id}`} value={`course:${c.id}`}>
              {c.name}
            </SelectItem>
          ))}
        {todosEnabled &&
          activeTodos.map((t) => (
            <SelectItem key={`t:${t.id}`} value={`todo:${t.id}`}>
              {t.title}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

// ─── Custom duration editor ───────────────────────────────────────────────────

const QUICK_MINS = [5, 10, 15, 20, 25, 30, 45, 60];

function SpinDigit({
  value,
  dirRef,
  pad,
}: {
  value: number;
  dirRef: React.MutableRefObject<1 | -1>;
  pad: number;
}) {
  return (
    <div className="relative h-14 w-20 overflow-hidden flex items-center justify-center">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={value}
          initial={{ y: dirRef.current > 0 ? 24 : -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: dirRef.current > 0 ? -24 : 24, opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute text-[2.75rem] font-mono font-bold tabular-nums leading-none select-none"
        >
          {String(value).padStart(pad, "0")}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function CustomDurationEditor({
  mins,
  secs,
  onChange,
  disabled,
  presets,
  onApplyPreset,
  onSavePreset,
  onRemovePreset,
}: {
  mins: number;
  secs: number;
  onChange: (mins: number, secs: number) => void;
  disabled: boolean;
  presets: { id: string; name: string; durationSeconds: number }[];
  onApplyPreset: (p: { durationSeconds: number }) => void;
  onSavePreset: () => void;
  onRemovePreset: (id: string) => void;
}) {
  const minsDirRef = useRef<1 | -1>(1);
  const secsDirRef = useRef<1 | -1>(1);

  function changeMins(delta: number) {
    if (disabled) return;
    minsDirRef.current = delta > 0 ? 1 : -1;
    onChange(Math.max(0, Math.min(999, mins + delta)), secs);
  }

  function changeSecs(delta: number) {
    if (disabled) return;
    secsDirRef.current = delta > 0 ? 1 : -1;
    onChange(mins, Math.max(0, Math.min(59, secs + delta)));
  }

  function applyQuick(m: number) {
    if (disabled) return;
    minsDirRef.current = m >= mins ? 1 : -1;
    secsDirRef.current = -1;
    onChange(m, 0);
  }

  const spinBtn =
    "flex items-center justify-center size-7 rounded-full hover:bg-muted active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2">
        <div className="flex flex-col items-center gap-1.5">
          <motion.button
            type="button"
            onClick={() => changeMins(1)}
            disabled={disabled}
            className={spinBtn}
            whileTap={{ scale: 0.85 }}
          >
            <ChevronUp className="size-4" />
          </motion.button>
          <SpinDigit value={mins} dirRef={minsDirRef} pad={2} />
          <motion.button
            type="button"
            onClick={() => changeMins(-1)}
            disabled={disabled || mins === 0}
            className={spinBtn}
            whileTap={{ scale: 0.85 }}
          >
            <ChevronDown className="size-4" />
          </motion.button>
          <span className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase mt-0.5">
            Min
          </span>
        </div>

        <span className="text-[2.25rem] font-mono font-bold text-muted-foreground/40 pb-8 select-none">
          :
        </span>

        <div className="flex flex-col items-center gap-1.5">
          <motion.button
            type="button"
            onClick={() => changeSecs(5)}
            disabled={disabled}
            className={spinBtn}
            whileTap={{ scale: 0.85 }}
          >
            <ChevronUp className="size-4" />
          </motion.button>
          <SpinDigit value={secs} dirRef={secsDirRef} pad={2} />
          <motion.button
            type="button"
            onClick={() => changeSecs(-5)}
            disabled={disabled || secs === 0}
            className={spinBtn}
            whileTap={{ scale: 0.85 }}
          >
            <ChevronDown className="size-4" />
          </motion.button>
          <span className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase mt-0.5">
            Sec
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 justify-center">
        {QUICK_MINS.map((m) => {
          const active = mins === m && secs === 0;
          return (
            <motion.button
              key={m}
              type="button"
              onClick={() => applyQuick(m)}
              disabled={disabled}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                active
                  ? "text-white border-transparent"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-[#14b8a6]/60"
              )}
              style={active ? { backgroundColor: MODES.custom.accent } : undefined}
            >
              {m}m
            </motion.button>
          );
        })}
      </div>

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {presets.map((p) => (
            <div
              key={p.id}
              className="inline-flex items-center rounded-full border bg-background text-xs pl-2.5 pr-1 py-0.5 gap-0.5"
            >
              <button
                type="button"
                onClick={() => onApplyPreset(p)}
                className="hover:text-foreground py-0.5"
              >
                {p.name}{" "}
                <span className="text-muted-foreground font-mono">
                  {formatTime(p.durationSeconds)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onRemovePreset(p.id)}
                className="text-muted-foreground hover:text-foreground p-0.5 ml-0.5"
                aria-label={`Delete ${p.name}`}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onSavePreset}
          className="gap-1.5 rounded-full"
        >
          <Plus className="size-3.5" />
          Save as preset
        </Button>
      </div>
    </div>
  );
}

// ─── Settings modal ───────────────────────────────────────────────────────────

function SettingsModal({
  open,
  onClose,
  settings,
  onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  settings: {
    workMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    sessionsBeforeLongBreak: number;
    autoStartBreaks: boolean;
    autoStartFocus: boolean;
    soundEnabled: boolean;
  };
  onUpdate: (s: Partial<typeof settings>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="size-4" />
            Timer Settings
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { key: "workMinutes", label: "Focus (min)" },
                { key: "shortBreakMinutes", label: "Short break (min)" },
                { key: "longBreakMinutes", label: "Long break (min)" },
                { key: "sessionsBeforeLongBreak", label: "Sessions until long break" },
              ] as const
            ).map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input
                  type="number"
                  min={1}
                  value={settings[key]}
                  onChange={(e) =>
                    onUpdate({
                      [key]: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className="text-center tabular-nums"
                />
              </div>
            ))}
          </div>
          <div className="space-y-3 border-t pt-3">
            {(
              [
                { key: "autoStartBreaks", label: "Auto-start breaks" },
                { key: "autoStartFocus", label: "Auto-start focus sessions" },
                { key: "soundEnabled", label: "Sound effects" },
              ] as const
            ).map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="text-sm">{label}</span>
                <Switch
                  checked={settings[key] as boolean}
                  onCheckedChange={(v) => onUpdate({ [key]: v })}
                />
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="rounded-full px-6 w-full">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Stats panel ──────────────────────────────────────────────────────────────

function StatsPanel({
  dailyLogs,
}: {
  dailyLogs: {
    date: string;
    focusMinutes: number;
    sessionsCompleted: number;
    customMinutes?: number;
  }[];
}) {
  const today = getTodayString();
  const todayLog = dailyLogs.find((l) => l.date === today);
  const focusMin = todayLog?.focusMinutes ?? 0;
  const sessions = todayLog?.sessionsCompleted ?? 0;
  const hours = Math.floor(focusMin / 60);
  const mins = focusMin % 60;
  const timeStr =
    hours > 0
      ? `${hours}h ${mins > 0 ? `${mins}m` : ""}`
      : focusMin > 0
      ? `${mins}m`
      : "—";

  const streak = useMemo(() => {
    const byDate = new Set(
      dailyLogs.filter((l) => l.sessionsCompleted > 0).map((l) => l.date)
    );
    let count = 0;
    const d = new Date();
    while (byDate.has(d.toISOString().split("T")[0])) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [dailyLogs]);

  const weekly = useMemo(() => {
    const dayLetters = ["S", "M", "T", "W", "T", "F", "S"];
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const log = dailyLogs.find((l) => l.date === ds);
      out.push({
        ds,
        minutes: log?.focusMinutes ?? 0,
        isToday: i === 0,
        day: dayLetters[d.getDay()],
      });
    }
    const max = Math.max(...out.map((x) => x.minutes), 1);
    return out.map((x) => ({ ...x, pct: (x.minutes / max) * 100 }));
  }, [dailyLogs]);

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-2xl border bg-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Today
        </p>
        <p className="text-2xl font-bold tabular-nums mt-1.5">{timeStr}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {sessions} session{sessions !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Streak
        </p>
        <p className="text-2xl font-bold mt-1.5 flex items-center gap-1 tabular-nums">
          {streak > 0 ? (
            <>
              <Flame className="size-5 text-orange-500 shrink-0" />
              {streak}
            </>
          ) : (
            <span className="text-muted-foreground/40">—</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {streak === 1 ? "day" : "days"}
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          7 days
        </p>
        <div className="flex items-end gap-0.5 h-9">
          {weekly.map((w) => (
            <div
              key={w.ds}
              className="flex-1 rounded-sm transition-all duration-300 min-h-[3px]"
              style={{
                height: `${Math.max(8, (w.pct / 100) * 36)}px`,
                backgroundColor: w.isToday
                  ? "var(--primary)"
                  : "currentColor",
                opacity: w.isToday ? 1 : 0.3,
              }}
              title={`${w.minutes}m`}
            />
          ))}
        </div>
        <div className="flex mt-1">
          {weekly.map((w) => (
            <div
              key={w.ds}
              className={cn(
                "flex-1 text-center text-[9px]",
                w.isToday ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              {w.day}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function PomodoroView() {
  const mounted = useMounted();

  const settings = usePomodoroStore((s) => s.settings);
  const updateSettings = usePomodoroStore((s) => s.updateSettings);
  const dailyLogs = usePomodoroStore((s) => s.dailyLogs);
  const customPresets = usePomodoroStore((s) => s.customPresets);
  const addPreset = usePomodoroStore((s) => s.addPreset);
  const removePreset = usePomodoroStore((s) => s.removePreset);
  const runtime = usePomodoroStore((s) => s.timerRuntime);

  const startTimer = usePomodoroStore((s) => s.startTimer);
  const pauseTimer = usePomodoroStore((s) => s.pauseTimer);
  const resetTimer = usePomodoroStore((s) => s.resetTimer);
  const skipSession = usePomodoroStore((s) => s.skipSession);
  const setTimerMode = usePomodoroStore((s) => s.setTimerMode);
  const setStudyingStore = usePomodoroStore((s) => s.setStudying);
  const setCustomDuration = usePomodoroStore((s) => s.setCustomDuration);
  const applyCustomPreset = usePomodoroStore((s) => s.applyCustomPreset);

  const {
    mode,
    isRunning,
    sessionCount,
    studying,
    customMins,
    customSecs,
    customDuration,
  } = runtime;

  // Force re-render every 500ms while running so the display ticks down.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [isRunning]);

  const timeRemaining = getCurrentRemaining(runtime);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [customPanelOpen, setCustomPanelOpen] = useState(true);

  const sessionsBefore = settings.sessionsBeforeLongBreak;
  const displaySessionCount = sessionCount % sessionsBefore;

  function handlePlayPause() {
    if (
      !isRunning &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }
    if (isRunning) pauseTimer();
    else startTimer();
  }

  function applyPreset(p: { durationSeconds: number }) {
    applyCustomPreset(p.durationSeconds);
  }

  function savePreset() {
    const name = presetName.trim();
    if (!name) return;
    addPreset({ id: crypto.randomUUID(), name, durationSeconds: customDuration });
    setPresetName("");
    setPresetModalOpen(false);
  }

  const cfg = MODES[mode];
  const total = getDurationForMode(mode, settings, customDuration);
  const isAtStart = timeRemaining === total;

  if (!mounted) return <div className="h-[80vh]" />;

  return (
    <ModuleGuard moduleId="pomodoro">
      <div className="max-w-[580px] mx-auto space-y-4 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Focus Timer</h1>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
          >
            <SettingsIcon className="size-4" />
          </Button>
        </div>

        {/* Mode pills */}
        <ModePills
          current={mode}
          onChange={setTimerMode}
          workMin={settings.workMinutes}
          shortMin={settings.shortBreakMinutes}
          longMin={settings.longBreakMinutes}
          customDurationSec={customDuration}
        />

        {/* Timer card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="rounded-3xl border p-6 sm:p-8 flex flex-col items-center gap-5"
            style={{
              background: `linear-gradient(145deg, ${cfg.accentSoft}, transparent 60%)`,
              borderColor: `${cfg.accent}28`,
            }}
          >
            <div className="relative flex items-center justify-center">
              <TimerRing
                total={total}
                remaining={timeRemaining}
                accent={cfg.accent}
                trackOpacity={cfg.trackOpacity}
                isRunning={isRunning}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2"
                  style={{ color: cfg.accent }}
                >
                  {cfg.label}
                </span>
                <span className="text-[4.25rem] leading-none font-mono font-bold tabular-nums">
                  {formatTime(timeRemaining)}
                </span>
                {mode === "focus" && (
                  <span className="text-[11px] text-muted-foreground mt-2">
                    session {displaySessionCount + 1} of {sessionsBefore}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-5">
              <Button
                variant="ghost"
                size="icon"
                onClick={resetTimer}
                aria-label="Reset"
                className="rounded-full"
              >
                <RotateCcw className="size-4" />
              </Button>

              <motion.button
                type="button"
                onClick={handlePlayPause}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="flex items-center gap-2 px-9 py-3 rounded-full text-white font-semibold shadow-lg text-[15px]"
                style={{ backgroundColor: cfg.accent }}
              >
                {isRunning ? (
                  <>
                    <Pause className="size-4 fill-white" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="size-4 fill-white" />
                    {isAtStart ? "Start" : "Resume"}
                  </>
                )}
              </motion.button>

              {mode !== "custom" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipSession}
                  aria-label="Skip"
                  className="rounded-full"
                >
                  <SkipForward className="size-4" />
                </Button>
              ) : (
                <div className="size-9" />
              )}
            </div>

            <AnimatePresence>
              {mode === "focus" && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <SessionDots
                    completed={displaySessionCount}
                    total={sessionsBefore}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <StudyingSelector value={studying} onChange={setStudyingStore} />
          </motion.div>
        </AnimatePresence>

        {/* Custom duration editor */}
        <AnimatePresence initial={false}>
          {mode === "custom" && (
            <motion.div
              key="custom-editor"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border bg-card">
                <button
                  type="button"
                  onClick={() => setCustomPanelOpen((v) => !v)}
                  className="flex items-center justify-between w-full px-5 py-3.5 text-sm font-medium"
                >
                  <span>Custom Duration</span>
                  <motion.span
                    animate={{ rotate: customPanelOpen ? 0 : -90 }}
                    transition={{ duration: 0.2 }}
                    className="inline-flex text-muted-foreground"
                  >
                    <ChevronDown className="size-4" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {customPanelOpen && (
                    <motion.div
                      key="panel-content"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 border-t">
                        <div className="pt-4">
                          <CustomDurationEditor
                            mins={customMins}
                            secs={customSecs}
                            onChange={setCustomDuration}
                            disabled={isRunning}
                            presets={customPresets}
                            onApplyPreset={applyPreset}
                            onSavePreset={() => setPresetModalOpen(true)}
                            onRemovePreset={removePreset}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <StatsPanel dailyLogs={dailyLogs} />

        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onUpdate={updateSettings}
        />

        <Dialog open={presetModalOpen} onOpenChange={setPresetModalOpen}>
          <DialogContent className="sm:max-w-xs rounded-2xl">
            <DialogHeader>
              <DialogTitle>Save as preset</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name (e.g. Deep Work)"
                onKeyDown={(e) => e.key === "Enter" && savePreset()}
                autoFocus
              />
              <div className="rounded-xl bg-muted/60 p-3 text-sm flex justify-between items-center">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-mono font-semibold">
                  {formatTime(customDuration)}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setPresetModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={savePreset}
                disabled={!presetName.trim()}
                className="rounded-full"
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleGuard>
  );
}
