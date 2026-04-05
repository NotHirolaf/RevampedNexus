import { create } from "zustand";
import { isFirebaseEnabled, getFirebaseServices } from "@/lib/firebase";
import type { User as FirebaseUser } from "firebase/auth";

// ─────────────────────────────────────────────────────────────────────────────
// Persistence helpers for syncEnabled only.
// The Firebase User is intentionally NOT persisted — the SDK manages its own
// session via IndexedDB. Never put the User object in Zustand persist or
// localStorage.
// ─────────────────────────────────────────────────────────────────────────────
const AUTH_PREFS_KEY = "nexus:auth-prefs";

interface AuthPrefs {
  syncEnabled: boolean;
}

function readAuthPrefs(): AuthPrefs {
  if (typeof window === "undefined") return { syncEnabled: true };
  try {
    const raw = localStorage.getItem(AUTH_PREFS_KEY);
    if (!raw) return { syncEnabled: true };
    return JSON.parse(raw) as AuthPrefs;
  } catch {
    return { syncEnabled: true };
  }
}

function writeAuthPrefs(prefs: AuthPrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage quota exceeded — silent fail.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Store interface
// ─────────────────────────────────────────────────────────────────────────────
export interface AuthState {
  user: FirebaseUser | null;
  /** True while waiting for the initial onAuthStateChanged response. */
  loading: boolean;
  /** Persisted to localStorage["nexus:auth-prefs"]. */
  syncEnabled: boolean;
  /** Updated by useFirebaseSync after each successful Firestore write. */
  lastSyncedAt: Date | null;
  error: string | null;
  /** Injected by useFirebaseSync so any component can trigger a manual sync. */
  _syncNow: (() => Promise<void>) | null;

  /**
   * Sets up the onAuthStateChanged listener. Idempotent — safe to call more
   * than once (guarded by a module-level flag so React StrictMode's
   * double-invoke doesn't create duplicate listeners).
   */
  init: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  toggleSync: () => void;
  setSyncNow: (fn: (() => Promise<void>) | null) => void;
  setLastSyncedAt: (date: Date | null) => void;
}

// Module-level guard — prevents double-setup in React StrictMode.
let _initCalled = false;
// Hold the unsubscribe function returned by onAuthStateChanged.
let _unsubscribeAuth: (() => void) | null = null;

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  // Start loading only when Firebase is configured; otherwise resolve immediately.
  loading: isFirebaseEnabled,
  syncEnabled: readAuthPrefs().syncEnabled,
  lastSyncedAt: null,
  error: null,
  _syncNow: null,

  // ── init ──────────────────────────────────────────────────────────────────
  init: () => {
    if (_initCalled) return;
    _initCalled = true;

    if (!isFirebaseEnabled) {
      set({ loading: false });
      return;
    }

    getFirebaseServices().then(({ auth }) => {
      if (!auth) {
        set({ loading: false });
        return;
      }

      import("firebase/auth").then(({ onAuthStateChanged }) => {
        // Tear down any previous listener before creating a new one.
        _unsubscribeAuth?.();
        _unsubscribeAuth = onAuthStateChanged(auth, (user) => {
          set({ user, loading: false, error: null });
        });
      });
    });
  },

  // ── signInWithGoogle ───────────────────────────────────────────────────────
  signInWithGoogle: async () => {
    if (!isFirebaseEnabled) return;
    set({ error: null, loading: true });
    try {
      const { auth } = await getFirebaseServices();
      if (!auth) throw new Error("Firebase auth not available");
      const { signInWithPopup, GoogleAuthProvider } = await import(
        "firebase/auth"
      );
      await signInWithPopup(auth, new GoogleAuthProvider());
      // user is set by the onAuthStateChanged listener.
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      set({ error: msg, loading: false });
    }
  },

  // ── signOut ────────────────────────────────────────────────────────────────
  signOut: async () => {
    if (!isFirebaseEnabled) return;
    set({ error: null });
    try {
      const { auth } = await getFirebaseServices();
      if (!auth) return;
      const { signOut: firebaseSignOut } = await import("firebase/auth");
      await firebaseSignOut(auth);
      set({ user: null, lastSyncedAt: null, _syncNow: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign out failed";
      set({ error: msg });
    }
  },

  // ── toggleSync ─────────────────────────────────────────────────────────────
  toggleSync: () => {
    const next = !get().syncEnabled;
    set({ syncEnabled: next });
    writeAuthPrefs({ syncEnabled: next });
  },

  // ── helpers set by useFirebaseSync ─────────────────────────────────────────
  setSyncNow: (fn) => set({ _syncNow: fn }),
  setLastSyncedAt: (date) => set({ lastSyncedAt: date }),
}));
