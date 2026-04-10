import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SemesterUpdate {
  id: string;
  label: string;  // e.g. "Fall 2025"
  sGPA: number;
  credits: number;
}

interface GPAState {
  baseCGPA: number | null;   // starting cumulative GPA
  baseCredits: number;       // credits already completed

  semesterUpdates: SemesterUpdate[];

  setBase: (cgpa: number | null, credits: number) => void;
  addSemesterUpdate: (update: SemesterUpdate) => void;
  updateSemesterUpdate: (id: string, partial: Partial<Omit<SemesterUpdate, "id">>) => void;
  removeSemesterUpdate: (id: string) => void;
  setSemesterUpdates: (updates: SemesterUpdate[]) => void;
}

export const useGPAStore = create<GPAState>()(
  persist(
    (set) => ({
      baseCGPA: null,
      baseCredits: 0,
      semesterUpdates: [],

      setBase: (cgpa, credits) => set({ baseCGPA: cgpa, baseCredits: credits }),

      addSemesterUpdate: (update) =>
        set((s) => ({ semesterUpdates: [...s.semesterUpdates, update] })),

      updateSemesterUpdate: (id, partial) =>
        set((s) => ({
          semesterUpdates: s.semesterUpdates.map((u) =>
            u.id === id ? { ...u, ...partial } : u
          ),
        })),

      removeSemesterUpdate: (id) =>
        set((s) => ({
          semesterUpdates: s.semesterUpdates.filter((u) => u.id !== id),
        })),

      setSemesterUpdates: (updates) => set({ semesterUpdates: updates }),
    }),
    { name: "nexus:gpa" }
  )
);

/**
 * Compute cumulative GPA from a base cGPA/credits plus semester updates.
 * Returns null if there is no data at all.
 */
export function computeCumulativeGPA(
  baseCGPA: number | null,
  baseCredits: number,
  semesterUpdates: SemesterUpdate[]
): { cgpa: number; totalCredits: number } | null {
  const basePoints = baseCGPA !== null ? baseCGPA * baseCredits : 0;
  const baseC = baseCGPA !== null ? baseCredits : 0;

  const updatePoints = semesterUpdates.reduce(
    (s, u) => s + u.sGPA * u.credits,
    0
  );
  const updateCredits = semesterUpdates.reduce((s, u) => s + u.credits, 0);

  const totalCredits = baseC + updateCredits;
  if (totalCredits === 0) return null;

  return {
    cgpa: (basePoints + updatePoints) / totalCredits,
    totalCredits,
  };
}
