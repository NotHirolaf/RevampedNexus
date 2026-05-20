import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Habit } from "@/types";

interface HabitState {
  habits: Habit[];
  addHabit: (habit: Habit) => void;
  updateHabit: (id: string, partial: Partial<Habit>) => void;
  removeHabit: (id: string) => void;
  toggleCompletion: (id: string, dateString: string) => void;
  reorderHabits: (orderedIds: string[]) => void;
  setHabits: (habits: Habit[]) => void;
}

export const useHabitStore = create<HabitState>()(
  persist(
    (set) => ({
      habits: [],

      addHabit: (habit) =>
        set((state) => ({ habits: [...state.habits, habit] })),

      updateHabit: (id, partial) =>
        set((state) => ({
          habits: state.habits.map((h) =>
            h.id === id ? { ...h, ...partial } : h
          ),
        })),

      removeHabit: (id) =>
        set((state) => ({
          habits: state.habits.filter((h) => h.id !== id),
        })),

      toggleCompletion: (id, dateString) =>
        set((state) => ({
          habits: state.habits.map((h) => {
            if (h.id !== id) return h;
            const has = h.completions.includes(dateString);
            return {
              ...h,
              completions: has
                ? h.completions.filter((d) => d !== dateString)
                : [...h.completions, dateString],
            };
          }),
        })),

      reorderHabits: (orderedIds) =>
        set((state) => {
          const map = new Map(state.habits.map((h) => [h.id, h]));
          const next: Habit[] = [];
          orderedIds.forEach((id, idx) => {
            const h = map.get(id);
            if (h) {
              next.push({ ...h, order: idx });
              map.delete(id);
            }
          });
          // Append any habits not in the ordered list at the end
          let i = next.length;
          for (const h of map.values()) {
            next.push({ ...h, order: i++ });
          }
          return { habits: next };
        }),

      setHabits: (habits) => set({ habits }),
    }),
    {
      name: "nexus:habits",
      migrate: (persisted: unknown) => {
        // Migrate v1 schema (description, targetCount, frequency: "daily"|"weekly")
        // to v2 (icon, color, frequency: "daily"|"weekdays"|"custom", order).
        if (!persisted || typeof persisted !== "object") return persisted;
        const state = persisted as { habits?: unknown[] };
        if (!Array.isArray(state.habits)) return persisted;
        const PALETTE = [
          "#6366f1", "#22c55e", "#f59e0b", "#ef4444",
          "#06b6d4", "#a855f7", "#ec4899", "#14b8a6",
        ];
        state.habits = state.habits.map((raw, idx) => {
          const h = raw as Record<string, unknown>;
          const freq = h.frequency === "weekly" ? "custom" : (h.frequency as string | undefined) ?? "daily";
          return {
            id: typeof h.id === "string" ? h.id : crypto.randomUUID(),
            name: typeof h.name === "string" ? h.name : "Habit",
            icon: typeof h.icon === "string" ? h.icon : undefined,
            color: typeof h.color === "string" ? h.color : PALETTE[idx % PALETTE.length],
            frequency: freq === "daily" || freq === "weekdays" || freq === "custom" ? freq : "daily",
            customDays: Array.isArray(h.customDays) ? (h.customDays as number[]) : undefined,
            completions: Array.isArray(h.completions) ? (h.completions as string[]) : [],
            createdAt: typeof h.createdAt === "string" ? h.createdAt : new Date().toISOString(),
            order: typeof h.order === "number" ? h.order : idx,
          };
        });
        return state;
      },
      version: 2,
    }
  )
);
