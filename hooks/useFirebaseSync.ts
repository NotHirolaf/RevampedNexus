"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { isFirebaseEnabled, getFirebaseServices } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/profile-store";
import { useModuleStore } from "@/stores/module-store";
import { useThemeStore } from "@/stores/theme-store";
import { useTodoStore } from "@/stores/useTodoStore";
import { useEventStore } from "@/stores/useEventStore";
import { useTimetableStore } from "@/stores/useTimetableStore";
import { useGradeStore } from "@/stores/useGradeStore";
import { usePomodoroStore } from "@/stores/usePomodoroStore";
import { useLinkStore } from "@/stores/useLinkStore";
import { useHabitStore } from "@/stores/useHabitStore";
import { useCanvasStore } from "@/stores/useCanvasStore";
import { useDashboardStore } from "@/stores/useDashboardStore";
import type { AccentColor } from "@/types";
import type { UserProfile, TodoItem, EventItem, TimetableEntry, Course, PomodoroSession, PomodoroSettings, QuickLink, Habit } from "@/types";

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
    // ── Module data stores ──────────────────────────────────────────────
    {
      docId: "todos",
      store: {
        subscribe: (listener) => useTodoStore.subscribe(() => listener()),
      },
      getData: () => ({ items: useTodoStore.getState().items }),
      setData: (data) => {
        const d = data as { items?: TodoItem[] };
        if (Array.isArray(d.items)) useTodoStore.getState().setTodos(d.items);
      },
    },
    {
      docId: "events",
      store: {
        subscribe: (listener) => useEventStore.subscribe(() => listener()),
      },
      getData: () => ({ items: useEventStore.getState().items }),
      setData: (data) => {
        const d = data as { items?: EventItem[] };
        if (Array.isArray(d.items)) useEventStore.getState().setEvents(d.items);
      },
    },
    {
      docId: "timetable",
      store: {
        subscribe: (listener) => useTimetableStore.subscribe(() => listener()),
      },
      getData: () => ({ entries: useTimetableStore.getState().entries }),
      setData: (data) => {
        const d = data as { entries?: TimetableEntry[] };
        if (Array.isArray(d.entries)) useTimetableStore.getState().setEntries(d.entries);
      },
    },
    {
      docId: "grades",
      store: {
        subscribe: (listener) => useGradeStore.subscribe(() => listener()),
      },
      getData: () => ({ courses: useGradeStore.getState().courses }),
      setData: (data) => {
        const d = data as { courses?: Course[] };
        if (Array.isArray(d.courses)) useGradeStore.getState().setCourses(d.courses);
      },
    },
    {
      docId: "pomodoro",
      store: {
        subscribe: (listener) => usePomodoroStore.subscribe(() => listener()),
      },
      getData: () => ({
        sessions: usePomodoroStore.getState().sessions,
        settings: usePomodoroStore.getState().settings,
      }),
      setData: (data) => {
        const d = data as { sessions?: PomodoroSession[]; settings?: PomodoroSettings };
        if (Array.isArray(d.sessions)) usePomodoroStore.getState().setSessions(d.sessions);
        if (d.settings && typeof d.settings === "object") usePomodoroStore.getState().setSettings(d.settings);
      },
    },
    {
      docId: "links",
      store: {
        subscribe: (listener) => useLinkStore.subscribe(() => listener()),
      },
      getData: () => ({ links: useLinkStore.getState().links }),
      setData: (data) => {
        const d = data as { links?: QuickLink[] };
        if (Array.isArray(d.links)) useLinkStore.getState().setLinks(d.links);
      },
    },
    {
      docId: "habits",
      store: {
        subscribe: (listener) => useHabitStore.subscribe(() => listener()),
      },
      getData: () => ({ habits: useHabitStore.getState().habits }),
      setData: (data) => {
        const d = data as { habits?: Habit[] };
        if (Array.isArray(d.habits)) useHabitStore.getState().setHabits(d.habits);
      },
    },
    {
      docId: "canvas-config",
      store: {
        subscribe: (listener) => useCanvasStore.subscribe(() => listener()),
      },
      getData: () => {
        const s = useCanvasStore.getState();
        // Deliberately exclude token — never sync to Firestore
        return {
          baseUrl: s.baseUrl,
          selectedCourseIds: s.selectedCourseIds,
          syncIntervalMinutes: s.syncIntervalMinutes,
          lastSyncedAt: s.lastSyncedAt,
        };
      },
      setData: (data) => {
        const d = data as {
          baseUrl?: string;
          selectedCourseIds?: number[];
          syncIntervalMinutes?: number;
          lastSyncedAt?: string;
        };
        if (d.selectedCourseIds) useCanvasStore.getState().setSelectedCourses(d.selectedCourseIds);
        if (typeof d.syncIntervalMinutes === "number") useCanvasStore.getState().setSyncInterval(d.syncIntervalMinutes);
        if (d.lastSyncedAt) useCanvasStore.getState().setLastSyncedAt(d.lastSyncedAt);
      },
    },
    {
      docId: "dashboard-layout",
      store: {
        subscribe: (listener) => useDashboardStore.subscribe(() => listener()),
      },
      getData: () => ({
        widgetOrder: useDashboardStore.getState().widgetOrder,
        hiddenWidgets: useDashboardStore.getState().hiddenWidgets,
      }),
      setData: (data) => {
        const d = data as { widgetOrder?: string[]; hiddenWidgets?: string[] };
        if (Array.isArray(d.widgetOrder)) useDashboardStore.getState().setWidgetOrder(d.widgetOrder);
        if (Array.isArray(d.hiddenWidgets)) useDashboardStore.getState().setHiddenWidgets(d.hiddenWidgets);
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
