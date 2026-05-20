import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PomodoroSession, PomodoroSettings } from "@/types";
import { getTodayString } from "@/lib/time-utils";

export type TimerMode = "focus" | "short_break" | "long_break" | "custom";

export interface CustomTimerPreset {
  id: string;
  name: string;
  durationSeconds: number;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  focusMinutes: number;
  sessionsCompleted: number;
  customMinutes: number;
}

export interface ExtendedPomodoroSettings extends PomodoroSettings {
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
}

const defaultSettings: ExtendedPomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
};

export interface TimerRuntime {
  mode: TimerMode;
  /** Absolute ms timestamp when current running segment ends. Null when paused. */
  endsAt: number | null;
  /** Seconds remaining when paused. Also the "authoritative" value while idle. */
  remainingAtPause: number;
  sessionCount: number;
  studying: string;
  customMins: number;
  customSecs: number;
  customDuration: number;
  isRunning: boolean;
}

const defaultTimerRuntime: TimerRuntime = {
  mode: "focus",
  endsAt: null,
  remainingAtPause: 25 * 60,
  sessionCount: 0,
  studying: "__none__",
  customMins: 10,
  customSecs: 0,
  customDuration: 600,
  isRunning: false,
};

interface PomodoroState {
  sessions: PomodoroSession[];
  settings: ExtendedPomodoroSettings;
  customPresets: CustomTimerPreset[];
  dailyLogs: DailyLog[];
  timerRuntime: TimerRuntime;

  // Data actions
  addSession: (session: PomodoroSession) => void;
  updateSettings: (partial: Partial<ExtendedPomodoroSettings>) => void;
  setSessions: (sessions: PomodoroSession[]) => void;
  setSettings: (settings: PomodoroSettings) => void;
  resetSettings: () => void;
  addPreset: (preset: CustomTimerPreset) => void;
  removePreset: (id: string) => void;
  logFocusMinutes: (minutes: number, completedSession: boolean) => void;
  logCustomMinutes: (minutes: number) => void;

  // Timer engine actions
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipSession: () => void;
  setTimerMode: (mode: TimerMode) => void;
  setStudying: (v: string) => void;
  setCustomDuration: (mins: number, secs: number) => void;
  applyCustomPreset: (durationSeconds: number) => void;

  // Internal
  _handleSessionEnd: () => void;
  _rehydrate: () => void;
}

function updateDailyLog(
  logs: DailyLog[],
  patch: (log: DailyLog) => DailyLog
): DailyLog[] {
  const today = getTodayString();
  const idx = logs.findIndex((l) => l.date === today);
  if (idx >= 0) {
    const next = [...logs];
    next[idx] = patch(next[idx]);
    return next;
  }
  const fresh: DailyLog = {
    date: today,
    focusMinutes: 0,
    sessionsCompleted: 0,
    customMinutes: 0,
  };
  return [...logs, patch(fresh)];
}

export function getDurationForMode(
  mode: TimerMode,
  settings: ExtendedPomodoroSettings,
  customDuration: number
): number {
  if (mode === "focus") return settings.workMinutes * 60;
  if (mode === "short_break") return settings.shortBreakMinutes * 60;
  if (mode === "long_break") return settings.longBreakMinutes * 60;
  return customDuration;
}

export function getCurrentRemaining(runtime: TimerRuntime): number {
  if (runtime.isRunning && runtime.endsAt != null) {
    return Math.max(0, Math.ceil((runtime.endsAt - Date.now()) / 1000));
  }
  return runtime.remainingAtPause;
}

function playChime() {
  if (typeof window === "undefined") return;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AC();
    const now = ctx.currentTime;
    const play = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.25, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    };
    play(880, 0, 0.3);
    play(1320, 0.25, 0.5);
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // ignore
  }
}

function fireNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch {
    // ignore
  }
}

// ─── Module-level global tick singleton ─────────────────────────────────────
// Lives outside the store/component lifecycle so the timer continues running
// even when the Pomodoro page has unmounted.

let tickInterval: ReturnType<typeof setInterval> | null = null;

function startGlobalTick() {
  if (tickInterval != null) return;
  if (typeof window === "undefined") return;
  tickInterval = setInterval(() => {
    const s = usePomodoroStore.getState();
    const r = s.timerRuntime;
    if (!r.isRunning || r.endsAt == null) {
      stopGlobalTick();
      return;
    }
    if (Date.now() >= r.endsAt) {
      s._handleSessionEnd();
    }
  }, 500);
}

function stopGlobalTick() {
  if (tickInterval != null) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      sessions: [],
      settings: defaultSettings,
      customPresets: [],
      dailyLogs: [],
      timerRuntime: defaultTimerRuntime,

      addSession: (session) =>
        set((state) => ({ sessions: [...state.sessions, session] })),

      updateSettings: (partial) =>
        set((state) => {
          const nextSettings = { ...state.settings, ...partial };
          // If paused and the current mode's duration just changed, sync remaining.
          const r = state.timerRuntime;
          if (!r.isRunning && r.mode !== "custom") {
            const newDur = getDurationForMode(
              r.mode,
              nextSettings,
              r.customDuration
            );
            const oldDur = getDurationForMode(
              r.mode,
              state.settings,
              r.customDuration
            );
            if (r.remainingAtPause === oldDur && newDur !== oldDur) {
              return {
                settings: nextSettings,
                timerRuntime: { ...r, remainingAtPause: newDur },
              };
            }
          }
          return { settings: nextSettings };
        }),

      setSessions: (sessions) => set({ sessions }),
      setSettings: (settings) =>
        set((state) => ({
          settings: { ...defaultSettings, ...state.settings, ...settings },
        })),
      resetSettings: () => set({ settings: defaultSettings }),

      addPreset: (preset) =>
        set((state) => ({ customPresets: [...state.customPresets, preset] })),

      removePreset: (id) =>
        set((state) => ({
          customPresets: state.customPresets.filter((p) => p.id !== id),
        })),

      logFocusMinutes: (minutes, completedSession) =>
        set((state) => ({
          dailyLogs: updateDailyLog(state.dailyLogs, (l) => ({
            ...l,
            focusMinutes: l.focusMinutes + minutes,
            sessionsCompleted: l.sessionsCompleted + (completedSession ? 1 : 0),
          })),
        })),

      logCustomMinutes: (minutes) =>
        set((state) => ({
          dailyLogs: updateDailyLog(state.dailyLogs, (l) => ({
            ...l,
            customMinutes: l.customMinutes + minutes,
          })),
        })),

      // ─── Timer engine ─────────────────────────────────────────────────────

      startTimer: () => {
        const { timerRuntime: r, settings } = get();
        if (r.isRunning) return;
        // If remaining is 0, restart from full duration.
        const fullDur = getDurationForMode(r.mode, settings, r.customDuration);
        const remaining = r.remainingAtPause > 0 ? r.remainingAtPause : fullDur;
        set({
          timerRuntime: {
            ...r,
            isRunning: true,
            endsAt: Date.now() + remaining * 1000,
            remainingAtPause: remaining,
          },
        });
        startGlobalTick();
      },

      pauseTimer: () => {
        const { timerRuntime: r } = get();
        if (!r.isRunning) return;
        const remaining = getCurrentRemaining(r);
        set({
          timerRuntime: {
            ...r,
            isRunning: false,
            endsAt: null,
            remainingAtPause: remaining,
          },
        });
        stopGlobalTick();
      },

      resetTimer: () => {
        const { timerRuntime: r, settings } = get();
        const dur = getDurationForMode(r.mode, settings, r.customDuration);
        set({
          timerRuntime: {
            ...r,
            isRunning: false,
            endsAt: null,
            remainingAtPause: dur,
          },
        });
        stopGlobalTick();
      },

      skipSession: () => {
        const { timerRuntime: r, settings } = get();
        stopGlobalTick();
        if (r.mode === "focus") {
          const nextCount = r.sessionCount + 1;
          const isLong = nextCount % settings.sessionsBeforeLongBreak === 0;
          const nextMode: TimerMode = isLong ? "long_break" : "short_break";
          const nextDur = getDurationForMode(
            nextMode,
            settings,
            r.customDuration
          );
          set({
            timerRuntime: {
              ...r,
              mode: nextMode,
              sessionCount: nextCount,
              isRunning: false,
              endsAt: null,
              remainingAtPause: nextDur,
            },
          });
        } else if (r.mode === "short_break" || r.mode === "long_break") {
          const nextDur = getDurationForMode(
            "focus",
            settings,
            r.customDuration
          );
          set({
            timerRuntime: {
              ...r,
              mode: "focus",
              isRunning: false,
              endsAt: null,
              remainingAtPause: nextDur,
            },
          });
        }
      },

      setTimerMode: (mode) => {
        const { timerRuntime: r, settings } = get();
        if (r.mode === mode) return;
        stopGlobalTick();
        const dur = getDurationForMode(mode, settings, r.customDuration);
        set({
          timerRuntime: {
            ...r,
            mode,
            isRunning: false,
            endsAt: null,
            remainingAtPause: dur,
          },
        });
      },

      setStudying: (v) =>
        set((state) => ({
          timerRuntime: { ...state.timerRuntime, studying: v },
        })),

      setCustomDuration: (mins, secs) => {
        const { timerRuntime: r } = get();
        const duration = Math.max(1, mins * 60 + secs);
        const patch: Partial<TimerRuntime> = {
          customMins: mins,
          customSecs: secs,
          customDuration: duration,
        };
        // If currently in custom mode and idle, update remaining too.
        if (r.mode === "custom" && !r.isRunning) {
          patch.remainingAtPause = duration;
        }
        set({ timerRuntime: { ...r, ...patch } });
      },

      applyCustomPreset: (durationSeconds) => {
        const { timerRuntime: r } = get();
        stopGlobalTick();
        const m = Math.floor(durationSeconds / 60);
        const s = durationSeconds % 60;
        set({
          timerRuntime: {
            ...r,
            customMins: m,
            customSecs: s,
            customDuration: durationSeconds,
            isRunning: false,
            endsAt: null,
            remainingAtPause:
              r.mode === "custom" ? durationSeconds : r.remainingAtPause,
          },
        });
      },

      _handleSessionEnd: () => {
        const state = get();
        const { timerRuntime: r, settings } = state;
        stopGlobalTick();

        if (settings.soundEnabled) playChime();

        if (r.mode === "custom") {
          fireNotification("Timer complete!", "Your custom timer finished.");
          state.logCustomMinutes(Math.round(r.customDuration / 60));
          set({
            timerRuntime: {
              ...r,
              isRunning: false,
              endsAt: null,
              remainingAtPause: r.customDuration,
            },
          });
          return;
        }

        if (r.mode === "focus") {
          state.logFocusMinutes(settings.workMinutes, true);
          const nextCount = r.sessionCount + 1;
          const isLong = nextCount % settings.sessionsBeforeLongBreak === 0;
          const next: TimerMode = isLong ? "long_break" : "short_break";
          const nextDur = getDurationForMode(next, settings, r.customDuration);
          fireNotification(
            "Focus complete!",
            isLong ? "Time for a long break." : "Time for a short break."
          );
          const autoStart = settings.autoStartBreaks;
          set({
            timerRuntime: {
              ...r,
              mode: next,
              sessionCount: nextCount,
              isRunning: autoStart,
              endsAt: autoStart ? Date.now() + nextDur * 1000 : null,
              remainingAtPause: nextDur,
            },
          });
          if (autoStart) startGlobalTick();
        } else {
          const nextDur = getDurationForMode(
            "focus",
            settings,
            r.customDuration
          );
          fireNotification("Break over!", "Ready to focus again?");
          const autoStart = settings.autoStartFocus;
          set({
            timerRuntime: {
              ...r,
              mode: "focus",
              isRunning: autoStart,
              endsAt: autoStart ? Date.now() + nextDur * 1000 : null,
              remainingAtPause: nextDur,
            },
          });
          if (autoStart) startGlobalTick();
        }
      },

      _rehydrate: () => {
        const state = get();
        const r = state.timerRuntime;
        if (!r.isRunning || r.endsAt == null) {
          stopGlobalTick();
          return;
        }
        // If the session already expired while the app was closed, fire it.
        if (Date.now() >= r.endsAt) {
          state._handleSessionEnd();
          return;
        }
        // Otherwise, resume ticking.
        startGlobalTick();
      },
    }),
    {
      name: "nexus:pomodoro",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PomodoroState>;
        const persistedRuntime = (p.timerRuntime ?? {}) as Partial<TimerRuntime> & {
          timeRemaining?: number;
          startedAt?: number | null;
        };
        // Migrate legacy schema (timeRemaining + startedAt) to new schema.
        const migratedRuntime: TimerRuntime = {
          ...defaultTimerRuntime,
          ...persistedRuntime,
          mode: (persistedRuntime.mode as TimerMode) ?? defaultTimerRuntime.mode,
          endsAt: persistedRuntime.endsAt ?? null,
          remainingAtPause:
            persistedRuntime.remainingAtPause ??
            persistedRuntime.timeRemaining ??
            defaultTimerRuntime.remainingAtPause,
          sessionCount:
            persistedRuntime.sessionCount ?? defaultTimerRuntime.sessionCount,
          studying: persistedRuntime.studying ?? defaultTimerRuntime.studying,
          customMins:
            persistedRuntime.customMins ?? defaultTimerRuntime.customMins,
          customSecs:
            persistedRuntime.customSecs ?? defaultTimerRuntime.customSecs,
          customDuration:
            persistedRuntime.customDuration ?? defaultTimerRuntime.customDuration,
          isRunning: persistedRuntime.isRunning ?? false,
        };
        return {
          ...current,
          ...p,
          settings: { ...defaultSettings, ...(p.settings ?? {}) },
          timerRuntime: migratedRuntime,
        } as PomodoroState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          setTimeout(() => state._rehydrate(), 0);
        }
      },
    }
  )
);

// Back-compat export (some older code may import this).
export const getPomodoroRemaining = () =>
  getCurrentRemaining(usePomodoroStore.getState().timerRuntime);
