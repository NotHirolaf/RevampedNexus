"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { useOnboardingStore } from "@/stores/onboarding-store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const completed = useOnboardingStore((s) => s.completed);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Wait for Zustand persist to rehydrate
    const unsub = useOnboardingStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    // If already hydrated
    if (useOnboardingStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return () => { unsub?.(); };
  }, []);

  useEffect(() => {
    if (hydrated && !completed) {
      router.replace("/onboarding");
    }
  }, [hydrated, completed, router]);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-primary/20" />
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!completed) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
