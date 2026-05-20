import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CitationFields,
  CitationFormat,
  CitationSourceType,
} from "@/lib/citations";

export interface Citation {
  id: string;
  sourceType: CitationSourceType;
  format: CitationFormat;
  fields: CitationFields;
  generatedText: string;
  createdAt: string;
}

interface CitationState {
  history: Citation[];
  addCitation: (c: Citation) => void;
  updateCitation: (id: string, partial: Partial<Omit<Citation, "id">>) => void;
  removeCitation: (id: string) => void;
  clearHistory: () => void;
  setHistory: (history: Citation[]) => void;
}

export const useCitationStore = create<CitationState>()(
  persist(
    (set) => ({
      history: [],

      addCitation: (c) =>
        set((s) => ({ history: [c, ...s.history] })),

      updateCitation: (id, partial) =>
        set((s) => ({
          history: s.history.map((c) =>
            c.id === id ? { ...c, ...partial } : c
          ),
        })),

      removeCitation: (id) =>
        set((s) => ({ history: s.history.filter((c) => c.id !== id) })),

      clearHistory: () => set({ history: [] }),

      setHistory: (history) => set({ history }),
    }),
    { name: "nexus:citations" }
  )
);
