"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { isFirebaseEnabled, getFirebaseServices } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/profile-store";
import { useModuleStore } from "@/stores/module-store";
import { useThemeStore } from "@/stores/theme-store";
import type { AccentColor } from "@/types";
import type { UserProfile } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Sync registry — one entry per Zustand store that should sync with Firestore.
// Adding a new store: add an entry here with docId, getData, setData, and
// a subscribe function that returns an unsubscribe function.
// ─────────────────────────────────────────────────────────────────────────────

// Minimal typing for the stores we subscribe to externally.
type StoreWithSubscribe = {
  subscribe: (listener: () => void) => () => void;
};

interface SyncEntry {
  docId: string;
  store: StoreWithSubscribe;
  getData: () => Record<string, unknown>;
  setData: (data: Record<string, unknown>) => void;
}

function buildRegistry(): SyncEntry[] {
  return [
    {
      docId: "profile",
      store: {
        subscribe: (listener) =>
          useProfileStore.subscribe(() => listener()),
      },
      getData: () => {
        const s = useProfileStore.getState();
        return {
          displayName: s.displayName,
          university: s.university,
          semester: s.semester,
          gpaScale: s.gpaScale,
          customGpaMax: s.customGpaMax,
          creditsObtained: s.creditsObtained,
          creditsRequired: s.creditsRequired,
        };
      },
      setData: (data) => {
        useProfileStore.getState().updateProfile(data as Partial<UserProfile>);
      },
    },
    {
      docId: "modules",
      store: {
        subscribe: (listener) =>
          useModuleStore.subscribe(() => listener()),
      },
      getData: () => ({
        enabledModules: useModuleStore.getState().enabledModules,
      }),
      setData: (data) => {
        const d = data as { enabledModules?: Record<string, boolean> };
        if (d.enabledModules && typeof d.enabledModules === "object") {
          useModuleStore.getState().setModules(d.enabledModules);
        }
      },
    },
    {
      docId: "preferences",
      store: {
        subscribe: (listener) =>
          useThemeStore.subscribe(() => listener()),
      },
      getData: () => ({
        accentColor: useThemeStore.getState().accentColor,
      }),
      setData: (data) => {
        const d = data as { accentColor?: string };
        if (d.accentColor) {
          useThemeStore.getState().setAccentColor(d.accentColor as AccentColor);
        }
      },
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook — called once at root level via FirebaseProvider.
// ─────────────────────────────────────────────────────────────────────────────
export function useFirebaseSync(): void {
  const user = useAuthStore((s) => s.user);
  const syncEnabled = useAuthStore((s) => s.syncEnabled);
  const shouldSync = isFirebaseEnabled && syncEnabled && user !== null;

  // "local" while we just wrote to Firestore — prevents snapshot re-upload loop.
  const syncSource = useRef<"local" | null>(null);
  const syncSourceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track first-sign-in conflict resolution per session.
  const firstSignInHandled = useRef(false);

  // Cleanup refs for active listeners.
  const unsubStores = useRef<Array<() => void>>([]);
  const unsubSnapshots = useRef<Array<() => void>>([]);
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  // Helper: set syncSource = "local" and reset after 2s.
  function markLocalWrite() {
    if (syncSourceTimer.current) clearTimeout(syncSourceTimer.current);
    syncSource.current = "local";
    syncSourceTimer.current = setTimeout(() => {
      syncSource.current = null;
    }, 2000);
  }

  useEffect(() => {
    if (!shouldSync || !user) return;

    let active = true;

    async function setup() {
      const { db } = await getFirebaseServices();
      if (!db || !active) return;

      const { doc, setDoc, collection, getDocs, onSnapshot } =
        await import("firebase/firestore");

      const registry = buildRegistry();
      const uid = user!.uid;

      // ── First-sign-in conflict resolution ─────────────────────────────────
      if (!firstSignInHandled.current) {
        firstSignInHandled.current = true;
        try {
          const dataColRef = collection(db, "users", uid, "data");
          const remoteSnaps = await getDocs(dataColRef);
          const remoteById = new Map(
            remoteSnaps.docs.map((d) => [d.id, d.data() as Record<string, unknown>])
          );

          for (const entry of registry) {
            const remoteData = remoteById.get(entry.docId);
            if (remoteData) {
              // Remote data exists — Firestore wins, apply to local store.
              markLocalWrite();
              entry.setData(remoteData);
            } else {
              // No remote doc — upload local data to Firestore.
              const docRef = doc(db, "users", uid, "data", entry.docId);
              await setDoc(docRef, entry.getData(), { merge: true });
            }
          }

          toast.info("Synced with your account");
        } catch {
          // Conflict resolution is best-effort — silent on failure.
        }
      }

      // ── Local → Firestore (debounced store subscriptions) ─────────────────
      for (const entry of registry) {
        const { docId, store, getData } = entry;

        const unsub = store.subscribe(() => {
          // If this change originated from a remote snapshot, skip re-upload.
          if (syncSource.current === "local") return;

          const existing = debounceTimers.current.get(docId);
          if (existing) clearTimeout(existing);

          const timer = setTimeout(async () => {
            debounceTimers.current.delete(docId);
            if (!active) return;
            try {
              const docRef = doc(db, "users", uid, "data", docId);
              markLocalWrite();
              await setDoc(docRef, getData(), { merge: true });
              useAuthStore.getState().setLastSyncedAt(new Date());
            } catch {
              // Silent.
            }
          }, 500);

          debounceTimers.current.set(docId, timer);
        });

        unsubStores.current.push(unsub);
      }

      // ── Firestore → local (onSnapshot listeners) ──────────────────────────
      for (const entry of registry) {
        const { docId, setData } = entry;
        const docRef = doc(db, "users", uid, "data", docId);

        const unsub = onSnapshot(
          docRef,
          (snap) => {
            if (!active) return;
            if (!snap.exists()) return;
            // Skip if this snapshot was triggered by our own write.
            if (syncSource.current === "local") return;

            const data = snap.data() as Record<string, unknown>;
            markLocalWrite(); // Prevent the setData call from triggering a re-upload.
            setData(data);
            useAuthStore.getState().setLastSyncedAt(new Date());
            toast.info("Synced from another device");
          },
          () => {
            // onSnapshot error — silent.
          }
        );

        unsubSnapshots.current.push(unsub);
      }
    }

    // ── syncNow — full write of all registry entries ───────────────────────
    async function syncNow() {
      if (!active) return;
      const { db } = await getFirebaseServices();
      if (!db) return;

      const { doc, setDoc } = await import("firebase/firestore");
      const uid = user!.uid;
      const registry = buildRegistry();

      for (const entry of registry) {
        try {
          const docRef = doc(db, "users", uid, "data", entry.docId);
          await setDoc(docRef, entry.getData(), { merge: true });
        } catch {
          // Silent.
        }
      }

      useAuthStore.getState().setLastSyncedAt(new Date());
      toast.success("Synced");
    }

    useAuthStore.getState().setSyncNow(syncNow);
    setup();

    return () => {
      active = false;

      unsubStores.current.forEach((fn) => fn());
      unsubStores.current = [];

      unsubSnapshots.current.forEach((fn) => fn());
      unsubSnapshots.current = [];

      debounceTimers.current.forEach((timer) => clearTimeout(timer));
      debounceTimers.current.clear();

      if (syncSourceTimer.current) clearTimeout(syncSourceTimer.current);

      useAuthStore.getState().setSyncNow(null);
    };
    // Re-run when the user signs in/out or sync is toggled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldSync, user?.uid]);
}
