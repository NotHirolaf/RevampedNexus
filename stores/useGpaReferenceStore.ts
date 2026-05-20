import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface GpaEntry {
  letter: string;
  minPercentage: number;
  maxPercentage: number;
  gpaPoints: number;
}

const DEFAULT_ENTRIES: GpaEntry[] = [
  { letter: "A+", minPercentage: 97, maxPercentage: 100, gpaPoints: 4.3 },
  { letter: "A", minPercentage: 93, maxPercentage: 96, gpaPoints: 4.0 },
  { letter: "A−", minPercentage: 90, maxPercentage: 92, gpaPoints: 3.7 },
  { letter: "B+", minPercentage: 87, maxPercentage: 89, gpaPoints: 3.3 },
  { letter: "B", minPercentage: 83, maxPercentage: 86, gpaPoints: 3.0 },
  { letter: "B−", minPercentage: 80, maxPercentage: 82, gpaPoints: 2.7 },
  { letter: "C+", minPercentage: 77, maxPercentage: 79, gpaPoints: 2.3 },
  { letter: "C", minPercentage: 73, maxPercentage: 76, gpaPoints: 2.0 },
  { letter: "C−", minPercentage: 70, maxPercentage: 72, gpaPoints: 1.7 },
  { letter: "D+", minPercentage: 67, maxPercentage: 69, gpaPoints: 1.3 },
  { letter: "D", minPercentage: 63, maxPercentage: 66, gpaPoints: 1.0 },
  { letter: "D−", minPercentage: 60, maxPercentage: 62, gpaPoints: 0.7 },
  { letter: "F", minPercentage: 0, maxPercentage: 59, gpaPoints: 0.0 },
];

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
