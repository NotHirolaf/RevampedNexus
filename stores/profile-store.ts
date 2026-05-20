import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProfile, GpaScale } from "@/types";

interface ProfileState extends UserProfile {
  updateProfile: (partial: Partial<UserProfile>) => void;
  resetProfile: () => void;
}

const defaultProfile: UserProfile = {
  displayName: "",
  university: "",
  semester: "",
  gpaScale: "4.0",
  customGpaMax: null,
  creditsObtained: null,
  creditsRequired: null,
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      ...defaultProfile,
      updateProfile: (partial) => set((state) => ({ ...state, ...partial })),
      resetProfile: () => set(defaultProfile),
    }),
    { name: "nexus:profile" }
  )
);
