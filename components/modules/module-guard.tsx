"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useModuleStore } from "@/stores/module-store";
import { useMounted } from "@/hooks/use-hydration";

export function ModuleGuard({
  moduleId,
  children,
}: {
  moduleId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const mounted = useMounted();
  const isEnabled = useModuleStore((s) => s.enabledModules[moduleId] ?? false);

  useEffect(() => {
    if (mounted && !isEnabled) {
      router.replace("/dashboard");
    }
  }, [mounted, isEnabled, router]);

  if (!mounted) return null;
  if (!isEnabled) return null;

  return <>{children}</>;
}
