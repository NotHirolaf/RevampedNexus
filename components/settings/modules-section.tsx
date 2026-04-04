"use client";

import { LayoutDashboard, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useModuleStore } from "@/stores/module-store";
import { modules, MODULE_CATEGORIES, CATEGORY_ORDER } from "@/lib/modules";

export function ModulesSection() {
  const { enabledModules, toggleModule } = useModuleStore();

  return (
    <div className="space-y-6">
      {/* Dashboard — always on */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10">
            <LayoutDashboard className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">Dashboard</span>
              <Badge variant="secondary" className="text-[10px]">
                <Lock className="size-3 mr-0.5" />
                Always on
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Your personalized home screen
            </p>
          </div>
          <Switch checked disabled aria-label="Dashboard is always enabled" />
        </CardContent>
      </Card>

      {CATEGORY_ORDER.map((cat) => {
        const catModules = modules.filter((m) => m.category === cat);
        if (catModules.length === 0) return null;

        return (
          <div key={cat} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {MODULE_CATEGORIES[cat]}
            </h3>
            <div className="grid gap-2">
              {catModules.map((mod) => {
                const Icon = mod.icon;
                const isEnabled = enabledModules[mod.id] ?? false;

                return (
                  <Card
                    key={mod.id}
                    className={`transition-colors cursor-pointer ${
                      isEnabled ? "border-primary/30 bg-primary/5" : ""
                    }`}
                    onClick={() => toggleModule(mod.id)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex items-center justify-center size-10 rounded-xl bg-muted">
                        <Icon className="size-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm">{mod.name}</span>
                        <p className="text-xs text-muted-foreground">
                          {mod.description}
                        </p>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => toggleModule(mod.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Toggle ${mod.name}`}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
