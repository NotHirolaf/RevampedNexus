"use client";

import { useCanvasSync } from "@/hooks/useCanvasSync";

/**
 * Mounts once at the root layout level.
 * Runs the Canvas sync hook passively in the background.
 * Returns null — no visible output.
 */
export function CanvasSyncProvider() {
  useCanvasSync();
  return null;
}
