"use client";

import { LayoutDashboard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useModuleStore } from "@/stores/module-store";
import {
  modules,
  MODULE_CATEGORIES,
  CATEGORY_ORDER,
  getDefaultEnabledModules,
} from "@/lib/modules";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface ModuleSelectStepProps {
  onNext: () => void;
  onBack: () => void;
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
};

export function ModuleSelectStep({ onNext, onBack }: ModuleSelectStepProps) {
  const { enabledModules, toggleModule, setModules } = useModuleStore();

  const enabledCount = Object.values(enabledModules).filter(Boolean).length;

  function selectAll() {
    const all: Record<string, boolean> = {};
    for (const mod of modules) {
      all[mod.id] = true;
    }
    setModules(all);
  }

  function recommendedOnly() {
    setModules(getDefaultEnabledModules());
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Choose your modules</h2>
        <p className="text-sm text-muted-foreground">
          Pick the tools you need. You can change these anytime in settings.
        </p>
        <AnimatePresence>
          {enabledCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary"
            >
              {enabledCount} selected
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-2 justify-center">
        <button
          type="button"
          onClick={selectAll}
          className="px-4 py-1.5 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Select All
        </button>
        <button
          type="button"
          onClick={recommendedOnly}
          className="px-4 py-1.5 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Recommended
        </button>
      </div>

      {/* Dashboard — always on */}
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/8 dark:bg-primary/15 border border-primary/20">
        <div className="flex items-center justify-center size-10 rounded-xl bg-primary/15 text-primary">
          <LayoutDashboard className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Dashboard</span>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">Always on</span>
          </div>
          <p className="text-xs text-muted-foreground">Your personalized home screen</p>
        </div>
        <Switch checked disabled aria-label="Dashboard is always enabled" />
      </div>

      {/* Module categories */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
        {CATEGORY_ORDER.map((cat) => {
          const catModules = modules.filter((m) => m.category === cat);
          if (catModules.length === 0) return null;

          return (
            <div key={cat} className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                {MODULE_CATEGORIES[cat]}
              </h3>
              <div className="grid gap-1.5">
                {catModules.map((mod) => {
                  const Icon = mod.icon;
                  const isEnabled = enabledModules[mod.id] ?? false;

                  return (
                    <motion.div key={mod.id} variants={cardVariants}>
                      <div
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all",
                          isEnabled
                            ? "bg-primary/8 dark:bg-primary/15 border border-primary/20"
                            : "bg-muted/40 dark:bg-muted/20 border border-transparent hover:bg-muted/70 dark:hover:bg-muted/30"
                        )}
                        onClick={() => toggleModule(mod.id)}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center size-10 rounded-xl transition-colors",
                            isEnabled
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="size-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{mod.name}</span>
                          <p className="text-xs text-muted-foreground">{mod.description}</p>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => toggleModule(mod.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Toggle ${mod.name}`}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </motion.div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack} className="rounded-full">
          Back
        </Button>
        <Button onClick={onNext} className="rounded-full px-6">
          Continue
        </Button>
      </div>
    </div>
  );
}
