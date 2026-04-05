// lib/firebase.ts
// Firebase SDK is NEVER statically imported — only dynamic imports inside functions.
// isFirebaseEnabled is synchronous (env vars are baked in at Next.js build time).

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

export const isFirebaseEnabled: boolean = REQUIRED_ENV_VARS.every(
  (key) => typeof process.env[key] === "string" && process.env[key] !== ""
);

interface FirebaseServices {
  auth: import("firebase/auth").Auth;
  db: import("firebase/firestore").Firestore;
}

interface DisabledServices {
  auth: null;
  db: null;
}

type ServicesResult = FirebaseServices | DisabledServices;

let cachedServices: ServicesResult | null = null;
let initPromise: Promise<ServicesResult> | null = null;

export async function getFirebaseServices(): Promise<ServicesResult> {
  if (!isFirebaseEnabled) {
    return { auth: null, db: null };
  }

  if (cachedServices) return cachedServices;

  // Coalesce concurrent callers onto a single init promise.
  if (initPromise) return initPromise;

  initPromise = (async (): Promise<ServicesResult> => {
    try {
      const { initializeApp, getApps, getApp } = await import("firebase/app");
      const { getAuth } = await import("firebase/auth");
      const { getFirestore, enableIndexedDbPersistence } = await import(
        "firebase/firestore"
      );

      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId:
          process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };

      // Avoid "duplicate app" error on HMR re-runs.
      const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

      const auth = getAuth(app);
      const db = getFirestore(app);

      // Enable offline persistence. Known non-fatal errors are ignored:
      //   "failed-precondition" — another tab already has persistence enabled
      //   "unimplemented"       — browser does not support IndexedDB
      try {
        await enableIndexedDbPersistence(db);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code !== "failed-precondition" && code !== "unimplemented") {
          console.warn("[Nexus] Firestore persistence error:", err);
        }
      }

      cachedServices = { auth, db };
      return cachedServices;
    } catch (err) {
      // Initialization failed — fall back to disabled so the app never breaks.
      console.error("[Nexus] Firebase initialization failed:", err);
      return { auth: null, db: null };
    }
  })();

  return initPromise;
}
