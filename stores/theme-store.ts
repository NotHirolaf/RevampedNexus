import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AccentColor } from "@/types";

interface ThemeState {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  resetTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      accentColor: "blue",
      setAccentColor: (color) => set({ accentColor: color }),
      resetTheme: () => set({ accentColor: "blue" }),
    }),
    { name: "nexus:theme" }
  )
);
