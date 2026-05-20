"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { WelcomeStep } from "@/components/onboarding/welcome-step";
import { ModuleSelectStep } from "@/components/onboarding/module-select-step";
import { ProfileStep } from "@/components/onboarding/profile-step";
import { ConfirmationStep } from "@/components/onboarding/confirmation-step";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <motion.div
            layout
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
              "flex items-center justify-center rounded-full text-xs font-medium transition-colors duration-300",
              i === current
                ? "size-7 bg-primary text-primary-foreground shadow-md"
                : i < current
                  ? "size-7 bg-primary/20 text-primary"
                  : "size-7 bg-muted text-muted-foreground"
            )}
          >
            {i < current ? (
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              i + 1
            )}
          </motion.div>
          {i < total - 1 && (
            <div className={cn(
              "w-8 h-0.5 rounded-full transition-colors duration-300",
              i < current ? "bg-primary/40" : "bg-muted"
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { completed, currentStep, setStep } = useOnboardingStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useOnboardingStore.persist.hasHydrated()) {
      setHydrated(true);
    } else {
      const unsub = useOnboardingStore.persist.onFinishHydration(() => {
        setHydrated(true);
      });
      return () => { unsub?.(); };
    }
  }, []);

  useEffect(() => {
    if (hydrated && completed) {
      router.replace("/dashboard");
    }
  }, [hydrated, completed, router]);

  if (!hydrated || completed) return null;

  function next() {
    setStep(currentStep + 1);
  }

  function back() {
    setStep(Math.max(0, currentStep - 1));
  }

  const steps = [
    <WelcomeStep key="welcome" onNext={next} />,
    <ModuleSelectStep key="modules" onNext={next} onBack={back} />,
    <ProfileStep key="profile" onNext={next} onBack={back} />,
    <ConfirmationStep key="confirm" />,
  ];

  return (
    <div className="w-full max-w-xl">
      {/* Material card */}
      <div className="bg-white dark:bg-[#242438] rounded-3xl shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_8px_32px_rgba(0,0,0,0.3)] px-6 py-8 md:px-10 md:py-10">
        <StepIndicator current={currentStep} total={4} />
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {steps[currentStep]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
