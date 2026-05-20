import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CanvasCourse } from "@/types";

export interface CanvasState {
  baseUrl: string | null;
  token: string | null;
  isConnected: boolean;
  selectedCourseIds: number[];
  courses: CanvasCourse[];
  lastSyncedAt: string | null;
  syncIntervalMinutes: number;
  displayName: string | null;
  _syncNow: (() => Promise<void>) | null;
}

interface CanvasActions {
  connect: (baseUrl: string, token: string, displayName: string) => void;
  disconnect: () => void;
  setCourses: (courses: CanvasCourse[]) => void;
  setSelectedCourses: (ids: number[]) => void;
  setSyncInterval: (minutes: number) => void;
  setLastSyncedAt: (date: string) => void;
  setSyncNow: (fn: (() => Promise<void>) | null) => void;
}

const initialState: Omit<CanvasState, "_syncNow"> = {
  baseUrl: null,
  token: null,
  isConnected: false,
  selectedCourseIds: [],
  courses: [],
  lastSyncedAt: null,
  syncIntervalMinutes: 30,
  displayName: null,
};

export const useCanvasStore = create<CanvasState & CanvasActions>()(
  persist(
    (set) => ({
      ...initialState,
      _syncNow: null,

      connect: (baseUrl, token, displayName) =>
        set({ baseUrl, token, isConnected: true, displayName }),

      disconnect: () =>
        set({ ...initialState, _syncNow: null }),

      setCourses: (courses) => set({ courses }),

      setSelectedCourses: (ids) => set({ selectedCourseIds: ids }),

      setSyncInterval: (minutes) => set({ syncIntervalMinutes: minutes }),

      setLastSyncedAt: (date) => set({ lastSyncedAt: date }),

      setSyncNow: (fn) => set({ _syncNow: fn }),
    }),
    {
      name: "nexus:canvas",
      partialize: (state) => ({
        baseUrl: state.baseUrl,
        token: state.token,
        isConnected: state.isConnected,
        selectedCourseIds: state.selectedCourseIds,
        courses: state.courses,
        lastSyncedAt: state.lastSyncedAt,
        syncIntervalMinutes: state.syncIntervalMinutes,
        displayName: state.displayName,
      }),
    }
  )
);
