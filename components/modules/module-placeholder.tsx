"use client";

import { getModuleById } from "@/lib/modules";
import { ModuleGuard } from "@/components/modules/module-guard";
import { Badge } from "@/components/ui/badge";

export function ModulePlaceholder({ moduleId }: { moduleId: string }) {
  const mod = getModuleById(moduleId);
  if (!mod) return null;

  const Icon = mod.icon;

  return (
    <ModuleGuard moduleId={moduleId}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="flex items-center justify-center size-16 rounded-2xl bg-muted">
          <Icon className="size-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{mod.name}</h2>
          <p className="text-muted-foreground max-w-sm">{mod.description}</p>
        </div>
        <Badge variant="secondary" className="text-xs">
          Coming soon
        </Badge>
      </div>
    </ModuleGuard>
  );
}
