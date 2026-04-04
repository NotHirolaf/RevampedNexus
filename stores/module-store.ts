import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getDefaultEnabledModules } from "@/lib/modules";

interface ModuleState {
  enabledModules: Record<string, boolean>;
  toggleModule: (id: string) => void;
  setModules: (modules: Record<string, boolean>) => void;
  resetToDefaults: () => void;
}

export const useModuleStore = create<ModuleState>()(
  persist(
    (set) => ({
      enabledModules: getDefaultEnabledModules(),
      toggleModule: (id) =>
        set((state) => ({
          enabledModules: {
            ...state.enabledModules,
            [id]: !state.enabledModules[id],
          },
        })),
      setModules: (modules) => set({ enabledModules: modules }),
      resetToDefaults: () => set({ enabledModules: getDefaultEnabledModules() }),
    }),
    { name: "nexus:modules" }
  )
);
