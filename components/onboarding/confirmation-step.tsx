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

  const enabledCount = modules.filter((m) => enabledModules[m.id]).length;

  function handleComplete() {
    completeOnboarding();
    router.replace("/dashboard");
  }

  return (
    <div className="flex flex-col items-center text-center gap-8 py-12">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15,
          delay: 0.1,
        }}
        className="flex items-center justify-center size-20 rounded-full bg-green-500/10"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
        >
          <Check className="size-10 text-green-500" />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-2"
      >
        <h2 className="text-2xl font-bold">You're all set!</h2>
        <p className="text-muted-foreground">
          You've enabled {enabledCount} module{enabledCount !== 1 ? "s" : ""}.
          You can customize everything in settings at any time.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <Button size="lg" onClick={handleComplete} className="rounded-xl px-8">
          Go to Dashboard
        </Button>
      </motion.div>
    </div>
  );
}
