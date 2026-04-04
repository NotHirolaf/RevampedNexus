"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/stores/theme-store";
import { useMounted } from "@/hooks/use-hydration";

export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  const accentColor = useThemeStore((s) => s.accentColor);
  const mounted = useMounted();

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    // Remove any existing accent classes
    root.classList.forEach((cls) => {
      if (cls.startsWith("accent-")) root.classList.remove(cls);
    });
    root.classList.add(`accent-${accentColor}`);
  }, [accentColor, mounted]);

  return <>{children}</>;
}
