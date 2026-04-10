import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ManualGPAEntry, WhatIfEntry } from "@/types";

interface GPAState {
  manualEntries: ManualGPAEntry[];
  whatIfEntries: WhatIfEntry[];

  // Manual entry actions
  addManualEntry: (entry: ManualGPAEntry) => void;
  updateManualEntry: (id: string, partial: Partial<Omit<ManualGPAEntry, "id">>) => void;
  removeManualEntry: (id: string) => void;
  setManualEntries: (entries: ManualGPAEntry[]) => void;

  // What-If entry actions
  addWhatIfEntry: (entry: WhatIfEntry) => void;
  updateWhatIfEntry: (id: string, partial: Partial<Omit<WhatIfEntry, "id">>) => void;
  removeWhatIfEntry: (id: string) => void;
  clearWhatIf: () => void;
}

export const useGPAStore = create<GPAState>()(
  persist(
    (set) => ({
      manualEntries: [],
      whatIfEntries: [],

      // ── Manual entry actions ────────────────────────────────────────────
      addManualEntry: (entry) =>
        set((s) => ({ manualEntries: [...s.manualEntries, entry] })),

      updateManualEntry: (id, partial) =>
        set((s) => ({
          manualEntries: s.manualEntries.map((e) =>
            e.id === id ? { ...e, ...partial } : e
          ),
        })),

      removeManualEntry: (id) =>
        set((s) => ({
          manualEntries: s.manualEntries.filter((e) => e.id !== id),
        })),

      setManualEntries: (entries) => set({ manualEntries: entries }),

      // ── What-If entry actions ───────────────────────────────────────────
      addWhatIfEntry: (entry) =>
        set((s) => ({ whatIfEntries: [...s.whatIfEntries, entry] })),

      updateWhatIfEntry: (id, partial) =>
        set((s) => ({
          whatIfEntries: s.whatIfEntries.map((e) =>
            e.id === id ? { ...e, ...partial } : e
          ),
        })),

      removeWhatIfEntry: (id) =>
        set((s) => ({
          whatIfEntries: s.whatIfEntries.filter((e) => e.id !== id),
        })),

      clearWhatIf: () => set({ whatIfEntries: [] }),
    }),
    { name: "nexus:gpa" }
  )
);
