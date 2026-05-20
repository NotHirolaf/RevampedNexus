"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useModuleStore } from "@/stores/module-store";
import { modules } from "@/lib/modules";
import { motion } from "motion/react";

export function ConfirmationStep() {
  const router = useRouter();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const enabledModules = useModuleStore((s) => s.enabledModules);

  const enabledModuleList = modules.filter((m) => enabledModules[m.id]);

  function handleComplete() {
    completeOnboarding();
    router.replace("/dashboard");
  }

  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15,
          delay: 0.1,
        }}
        className="flex items-center justify-center size-16 rounded-full bg-green-500/10 dark:bg-green-500/15"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
        >
          <Check className="size-8 text-green-500" strokeWidth={3} />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-2"
      >
        <h2 className="text-xl font-semibold text-foreground">You're all set!</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {enabledModuleList.length > 0
            ? `${enabledModuleList.length} module${enabledModuleList.length !== 1 ? "s" : ""} enabled — you can adjust these anytime.`
            : "You can enable modules anytime in Settings."}
        </p>
      </motion.div>

      {enabledModuleList.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="w-full max-w-sm mx-auto"
        >
          <div className="flex flex-wrap justify-center gap-1.5">
            {enabledModuleList.map((mod, i) => {
              const Icon = mod.icon;
              return (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.04, duration: 0.2 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 dark:bg-muted/30 text-xs font-medium text-foreground"
                  title={mod.name}
                >
                  <Icon className="size-3.5 text-primary" />
                  {mod.name}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Button
          size="lg"
          onClick={handleComplete}
          className="rounded-full px-8 h-11 text-sm font-medium shadow-sm"
        >
          Go to Dashboard
        </Button>
      </motion.div>
    </div>
  );
}
