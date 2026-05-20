"use client";

import { useMemo } from "react";
import {
  GripVertical,
  Eye,
  EyeOff,
  RotateCcw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  useDashboardStore,
  WIDGET_REGISTRY,
  DEFAULT_ORDER,
} from "@/stores/useDashboardStore";
import { useModuleStore } from "@/stores/module-store";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface DashboardCustomizeProps {
  onClose: () => void;
}

export function DashboardCustomize({ onClose }: DashboardCustomizeProps) {
  const { widgetOrder, hiddenWidgets, reorderWidget, toggleWidget, resetDashboard } =
    useDashboardStore();
  const enabledModules = useModuleStore((s) => s.enabledModules);

  // Build the ordered list of widgets — include any registered widget that has
  // at least one required module enabled. Follow the user's stored order, then
  // append any new widgets they haven't seen yet.
  const availableWidgets = WIDGET_REGISTRY.filter((w) =>
    w.moduleReq.some((m) => enabledModules[m])
  );
  const availableKeys = new Set(availableWidgets.map((w) => w.key));

  // Ordered keys: user order filtered to available, then any new available ones
  const orderedKeys = useMemo(() => [
    ...widgetOrder.filter((k) => availableKeys.has(k)),
    ...availableWidgets
      .map((w) => w.key)
      .filter((k) => !widgetOrder.includes(k)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [widgetOrder, enabledModules]);

  const metaByKey = Object.fromEntries(
    WIDGET_REGISTRY.map((w) => [w.key, w])
  );

  function handleMoveUp(key: string) {
    const idx = orderedKeys.indexOf(key);
    if (idx > 0) {
      const fromIdx = widgetOrder.indexOf(key);
      const prevKey = orderedKeys[idx - 1];
      const toIdx = widgetOrder.indexOf(prevKey);
      if (fromIdx >= 0 && toIdx >= 0) reorderWidget(fromIdx, toIdx);
    }
  }

  function handleMoveDown(key: string) {
    const idx = orderedKeys.indexOf(key);
    if (idx < orderedKeys.length - 1) {
      const fromIdx = widgetOrder.indexOf(key);
      const nextKey = orderedKeys[idx + 1];
      const toIdx = widgetOrder.indexOf(nextKey);
      if (fromIdx >= 0 && toIdx >= 0) reorderWidget(fromIdx, toIdx);
    }
  }

  const isDefault =
    JSON.stringify(widgetOrder) === JSON.stringify(DEFAULT_ORDER) &&
    hiddenWidgets.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Customize Dashboard</h3>
              <p className="text-xs text-muted-foreground">
                Toggle widgets and reorder them with the arrows
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetDashboard}
                  className="gap-1.5 text-muted-foreground"
                >
                  <RotateCcw className="size-3.5" />
                  Reset
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>

          <Separator />

          {/* Greeting — always on, not movable */}
          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
            <GripVertical className="size-4 text-muted-foreground/30" />
            <span className="flex-1 text-sm font-medium">
              Greeting &amp; Clock
            </span>
            <span className="text-xs text-muted-foreground mr-1">Always on</span>
            <Switch checked disabled size="sm" />
          </div>

          {/* Widget list */}
          <div className="space-y-1">
            {orderedKeys.map((key, index) => {
              const meta = metaByKey[key];
              if (!meta) return null;
              const isHidden = hiddenWidgets.includes(key);
              const isFirst = index === 0;
              const isLast = index === orderedKeys.length - 1;

              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
                    isHidden
                      ? "border-transparent opacity-50"
                      : "border-border"
                  )}
                >
                  {/* Reorder arrows */}
                  <div className="flex flex-col shrink-0">
                    <button
                      type="button"
                      disabled={isFirst || isHidden}
                      onClick={() => handleMoveUp(key)}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed p-0.5"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast || isHidden}
                      onClick={() => handleMoveDown(key)}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed p-0.5"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>

                  {/* Label */}
                  <span className="flex-1 text-sm font-medium min-w-0 truncate">
                    {meta.label}
                  </span>

                  {/* Visibility indicator */}
                  {isHidden ? (
                    <EyeOff className="size-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <Eye className="size-3.5 text-muted-foreground shrink-0" />
                  )}

                  {/* Toggle */}
                  <Switch
                    checked={!isHidden}
                    onCheckedChange={() => toggleWidget(key)}
                    size="sm"
                  />
                </div>
              );
            })}
          </div>

          {availableWidgets.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Enable modules in Settings to unlock more widgets.
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
