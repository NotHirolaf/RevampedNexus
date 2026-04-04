"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { WelcomeStep } from "@/components/onboarding/welcome-step";
import { ModuleSelectStep } from "@/components/onboarding/module-select-step";
import { ProfileStep } from "@/components/onboarding/profile-step";
import { ConfirmationStep } from "@/components/onboarding/confirmation-step";
import { AnimatePresence, motion } from "motion/react";

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
    <div className="w-full max-w-2xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {steps[currentStep]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
