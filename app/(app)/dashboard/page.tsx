"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { useModuleStore } from "@/stores/module-store";
import { useProfileStore } from "@/stores/profile-store";
import { modules } from "@/lib/modules";
import { useMounted } from "@/hooks/use-hydration";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const mounted = useMounted();
  const enabledModules = useModuleStore((s) => s.enabledModules);
  const displayName = useProfileStore((s) => s.displayName);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const enabledModuleConfigs = modules.filter((m) => enabledModules[m.id]);
  const greeting = displayName ? `Welcome back, ${displayName}` : "Welcome to Nexus";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{greeting}</h1>
        <p className="text-muted-foreground">Your university life, organized.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {enabledModuleConfigs.map((mod) => (
          <Link key={mod.id} href={mod.route}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10">
                  <mod.icon className="size-5 text-primary" />
                </div>
                <span className="text-sm font-medium">{mod.name}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
