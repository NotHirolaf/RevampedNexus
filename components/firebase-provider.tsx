"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useFirebaseSync } from "@/hooks/useFirebaseSync";

/**
 * Mounts once at the root layout level.
 * - Initialises the Firebase auth listener on first client render.
 * - Runs the Firestore sync hook passively in the background.
 * Returns null — no visible output.
 */
export function FirebaseProvider() {
  useEffect(() => {
    useAuthStore.getState().init();
  }, []);

  useFirebaseSync();

  return null;
}
