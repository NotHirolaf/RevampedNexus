"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const PROBE_KEY = "__nexus_storage_probe__";

function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(PROBE_KEY, "1");
    window.localStorage.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function StorageAvailabilityBanner() {
  const [available, setAvailable] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setAvailable(isStorageAvailable());
  }, []);

  if (available || dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-900 dark:text-amber-100"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="flex-1">
        <strong className="font-medium">Storage unavailable.</strong>{" "}
        Your data won&apos;t be saved between sessions. This usually happens in
        private browsing or when storage is disabled.
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss warning"
        className="rounded p-1 hover:bg-amber-500/20"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
