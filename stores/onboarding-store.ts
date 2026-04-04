import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OnboardingState {
  completed: boolean;
  currentStep: number;
  setStep: (step: number) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      currentStep: 0,
      setStep: (step) => set({ currentStep: step }),
      completeOnboarding: () => set({ completed: true, currentStep: 4 }),
      resetOnboarding: () => set({ completed: false, currentStep: 0 }),
    }),
    { name: "nexus:onboarding" }
  )
);
