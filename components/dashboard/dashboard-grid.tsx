"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { useMounted } from "@/hooks/use-hydration";
import { useModuleStore } from "@/stores/module-store";
import { useDashboardStore, WIDGET_REGISTRY } from "@/stores/useDashboardStore";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";

import { GreetingWidget } from "@/components/dashboard/widgets/greeting-widget";
import { NextClassWidget } from "@/components/dashboard/widgets/next-class-widget";
import { TodayScheduleWidget } from "@/components/dashboard/widgets/today-schedule-widget";
import { UpcomingDeadlinesWidget } from "@/components/dashboard/widgets/upcoming-deadlines-widget";
import { ActiveTasksWidget } from "@/components/dashboard/widgets/active-tasks-widget";
import { CurrentGPAWidget } from "@/components/dashboard/widgets/current-gpa-widget";
import { FocusStatsWidget } from "@/components/dashboard/widgets/focus-stats-widget";
import { HabitStreakWidget } from "@/components/dashboard/widgets/habit-streak-widget";
import { QuickLinksWidget } from "@/components/dashboard/widgets/quick-links-widget";
import { DashboardCustomize } from "@/components/dashboard/dashboard-customize";

// Map widget keys to their components
const WIDGET_COMPONENTS: Record<string, React.ComponentType> = {
  "next-class": NextClassWidget,
  "today-schedule": TodayScheduleWidget,
  "upcoming-deadlines": UpcomingDeadlinesWidget,
  "active-tasks": ActiveTasksWidget,
  "current-gpa": CurrentGPAWidget,
  "focus-stats": FocusStatsWidget,
  "habit-streak": HabitStreakWidget,
  "quick-links": QuickLinksWidget,
};

const WIDGET_META = Object.fromEntries(
  WIDGET_REGISTRY.map((w) => [w.key, w])
);

export function DashboardGrid() {
  const mounted = useMounted();
  const [editing, setEditing] = useState(false);
  const enabledModules = useModuleStore((s) => s.enabledModules);
  const widgetOrder = useDashboardStore((s) => s.widgetOrder);
  const hiddenWidgets = useDashboardStore((s) => s.hiddenWidgets);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-xl md:col-span-2" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  // Build visible widget list from user's order + module state
  const visibleWidgets = widgetOrder
    .filter((key) => {
      // Must not be hidden by user
      if (hiddenWidgets.includes(key)) return false;
      // Must have a registered component
      if (!WIDGET_COMPONENTS[key]) return false;
      // Must have at least one required module enabled
      const meta = WIDGET_META[key];
      if (!meta) return false;
      return meta.moduleReq.some((m) => enabledModules[m]);
    });

  // Also add any widgets that are in the registry & enabled but not yet in the user's order
  // (e.g. newly enabled modules)
  for (const w of WIDGET_REGISTRY) {
    if (
      !widgetOrder.includes(w.key) &&
      !hiddenWidgets.includes(w.key) &&
      w.moduleReq.some((m) => enabledModules[m]) &&
      WIDGET_COMPONENTS[w.key]
    ) {
      visibleWidgets.push(w.key);
    }
  }

  return (
    <div className="space-y-4">
      {/* Greeting — always pinned at top, never removable */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" as const }}
      >
        <GreetingWidget />
      </motion.div>

      {/* Customize panel */}
      <AnimatePresence>
        {editing && (
          <DashboardCustomize onClose={() => setEditing(false)} />
        )}
      </AnimatePresence>

      {/* Widget grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customize button row — only when not editing */}
        {!editing && (
          <motion.div
            className="md:col-span-2 flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              className="gap-1.5 text-muted-foreground"
            >
              <Settings2 className="size-3.5" />
              Customize
            </Button>
          </motion.div>
        )}

        {visibleWidgets.map((key, index) => {
          const Component = WIDGET_COMPONENTS[key];
          const meta = WIDGET_META[key];
          if (!Component || !meta) return null;

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: index * 0.05,
                ease: "easeOut" as const,
              }}
              className={meta.colSpan2 ? "md:col-span-2" : undefined}
            >
              <Component />
            </motion.div>
          );
        })}

        {visibleWidgets.length === 0 && !editing && (
          <motion.div
            className="md:col-span-2 text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-muted-foreground mb-2">
              No widgets visible. Customize your dashboard to add some.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              className="gap-1.5"
            >
              <Settings2 className="size-3.5" />
              Customize Dashboard
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
