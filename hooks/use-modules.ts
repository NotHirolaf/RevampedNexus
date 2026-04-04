"use client";

import { useModuleStore } from "@/stores/module-store";

export function useIsModuleEnabled(moduleId: string): boolean {
  return useModuleStore((state) => state.enabledModules[moduleId] ?? false);
}

export function useEnabledModules(): Record<string, boolean> {
  return useModuleStore((state) => state.enabledModules);
}
