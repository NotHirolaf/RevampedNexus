"use client";

import Link from "next/link";
import { Calculator, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { useGPAStore, computeCumulativeGPA } from "@/stores/useGPAStore";
import { useProfileStore } from "@/stores/profile-store";
import { useIsModuleEnabled } from "@/hooks/use-modules";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { Button } from "@/components/ui/button";

export function CurrentGPAWidget() {
  const semesterUpdates = useGPAStore((s) => s.semesterUpdates);
  const gpaScale = useProfileStore((s) => s.gpaScale);
  const customGpaMax = useProfileStore((s) => s.customGpaMax);
  const creditsRequired = useProfileStore((s) => s.creditsRequired);
  const gpaEnabled = useIsModuleEnabled("gpa");

  if (!gpaEnabled) return null;

  const maxGpa =
    gpaScale === "percentage" ? 100
    : gpaScale === "4.3" ? 4.3
    : gpaScale === "custom" ? (customGpaMax ?? 4.0)
    : 4.0;

  const result = computeCumulativeGPA(null, 0, semesterUpdates);
  const gpa = result?.cgpa ?? null;
  const totalCredits = result?.totalCredits ?? 0;

  // ─── Empty state ──────────────────────────────────────────────────────
  if (gpa === null) {
    return (
      <WidgetCard title="GPA" icon={Calculator}>
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <Calculator className="size-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            Add semester entries to see your GPA
          </p>
          <Button variant="outline" size="sm" render={<Link href="/gpa" />}>
            Open GPA Calculator
            <ArrowRight className="size-4 ml-1" />
          </Button>
        </div>
      </WidgetCard>
    );
  }

  // ─── Trend delta ──────────────────────────────────────────────────────
  const latest = semesterUpdates[semesterUpdates.length - 1];
  const prev = semesterUpdates.length >= 2
    ? semesterUpdates[semesterUpdates.length - 2]
    : null;
  const delta = prev ? latest.sGPA - prev.sGPA : 0;
  const hasTrend = prev !== null && Math.abs(delta) > 0.005;
  const trendUp = delta > 0;

  // ─── Progress (GPA as fraction of max) ────────────────────────────────
  const gpaPct = Math.min(100, Math.max(0, (gpa / maxGpa) * 100));

  // Color the bar by tier (on a 4.0-equivalent scale for consistency)
  const gpaOn4 = (gpa / maxGpa) * 4;
  const barColor =
    gpaOn4 >= 3.5 ? "bg-green-500"
    : gpaOn4 >= 3.0 ? "bg-blue-500"
    : gpaOn4 >= 2.0 ? "bg-amber-500"
    : "bg-destructive";

  // ─── Credits progress ─────────────────────────────────────────────────
  const creditsPct = creditsRequired && creditsRequired > 0
    ? Math.min(100, (totalCredits / creditsRequired) * 100)
    : null;

  return (
    <WidgetCard title="GPA" icon={Calculator} href="/gpa">
      <div className="space-y-3">
        {/* Primary: GPA + trend */}
        <div className="flex items-end justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <p className="text-4xl font-bold tabular-nums leading-none">
              {gpa.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">/ {maxGpa}</p>
          </div>
          {hasTrend && (
            <div
              className={`flex items-center gap-0.5 text-xs font-medium tabular-nums ${
                trendUp ? "text-green-600 dark:text-green-500" : "text-destructive"
              }`}
            >
              {trendUp ? (
                <TrendingUp className="size-3.5" />
              ) : (
                <TrendingDown className="size-3.5" />
              )}
              {trendUp ? "+" : ""}
              {delta.toFixed(2)}
            </div>
          )}
        </div>

        {/* GPA bar */}
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${gpaPct}%` }}
          />
        </div>

        {/* Secondary info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {latest && (
            <span className="truncate">
              <span className="text-foreground/70">{latest.label || "Latest"}</span>
              <span className="mx-1">·</span>
              <span className="tabular-nums">{latest.sGPA.toFixed(2)}</span>
            </span>
          )}
          <span className="tabular-nums shrink-0">
            {creditsPct !== null
              ? `${totalCredits} / ${creditsRequired} cr`
              : `${totalCredits} cr`}
          </span>
        </div>

        {/* Credits progress (only if target is set) */}
        {creditsPct !== null && (
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/60 transition-all"
              style={{ width: `${creditsPct}%` }}
            />
          </div>
        )}
      </div>
    </WidgetCard>
  );
}
