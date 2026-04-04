"use client";

import { LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center text-center gap-8 py-12">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="flex items-center justify-center size-20 rounded-2xl bg-primary text-primary-foreground"
      >
        <LayoutDashboard className="size-10" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="space-y-3"
      >
        <h1 className="text-4xl font-bold tracking-tight">Nexus</h1>
        <p className="text-lg text-muted-foreground">
          Your university life, organized.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <Button size="lg" onClick={onNext} className="rounded-xl px-8">
          Get Started
        </Button>
      </motion.div>
    </div>
  );
}
