"use client";

import { create } from "zustand";

// Non-persisted store — single source of truth for current time.
// One setInterval at the module level, shared by all subscribers.
const useClockStore = create<{ now: Date }>()(() => ({
  now: new Date(),
}));

if (typeof window !== "undefined") {
  // Shared single interval — NOT one per widget
  setInterval(() => {
    useClockStore.setState({ now: new Date() });
  }, 1000);
}

export function useRealtimeClock(): Date {
  return useClockStore((s) => s.now);
}
