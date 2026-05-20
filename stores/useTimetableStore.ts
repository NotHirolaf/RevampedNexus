import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TimetableEntry } from "@/types";

interface TimetableState {
  entries: TimetableEntry[];
  addEntry: (entry: TimetableEntry) => void;
  updateEntry: (id: string, partial: Partial<TimetableEntry>) => void;
  removeEntry: (id: string) => void;
  setEntries: (entries: TimetableEntry[]) => void;
}

export const useTimetableStore = create<TimetableState>()(
  persist(
    (set) => ({
      entries: [],

      addEntry: (entry) =>
        set((state) => ({ entries: [...state.entries, entry] })),

      updateEntry: (id, partial) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...partial } : e
          ),
        })),

      removeEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),

      setEntries: (entries) => set({ entries }),
    }),
    { name: "nexus:timetable" }
  )
);
