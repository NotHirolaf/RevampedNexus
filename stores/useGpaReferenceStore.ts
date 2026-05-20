import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface GpaEntry {
  letter: string;
  minPercentage: number;
  maxPercentage: number;
  gpaPoints: number;
}

const DEFAULT_ENTRIES: GpaEntry[] = [];

interface GpaReferenceState {
  entries: GpaEntry[];
  addEntry: (entry: GpaEntry) => void;
  updateEntry: (index: number, partial: Partial<GpaEntry>) => void;
  removeEntry: (index: number) => void;
  resetEntries: () => void;
}

export function lookupByPercentage(
  entries: GpaEntry[],
  pct: number
): GpaEntry | null {
  for (const e of entries) {
    if (pct >= e.minPercentage && pct <= e.maxPercentage) return e;
  }
  return null;
}

export function entriesOverlap(entries: GpaEntry[]): boolean {
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      if (a.maxPercentage < b.minPercentage) continue;
      if (b.maxPercentage < a.minPercentage) continue;
      return true;
    }
  }
  return false;
}

export const useGpaReferenceStore = create<GpaReferenceState>()(
  persist(
    (set) => ({
      entries: DEFAULT_ENTRIES,

      addEntry: (entry) =>
        set((s) => ({ entries: [...s.entries, entry] })),

      updateEntry: (index, partial) =>
        set((s) => ({
          entries: s.entries.map((e, i) =>
            i === index ? { ...e, ...partial } : e
          ),
        })),

      removeEntry: (index) =>
        set((s) => ({
          entries: s.entries.filter((_, i) => i !== index),
        })),

      resetEntries: () => set({ entries: DEFAULT_ENTRIES }),
    }),
    { name: "nexus:gpaReference" }
  )
);
