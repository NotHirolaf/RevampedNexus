"use client";

import Link from "next/link";
import { Calculator, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { useGradeStore } from "@/stores/useGradeStore";
import { useGPAStore, computeCumulativeGPA } from "@/stores/useGPAStore";
import { useProfileStore } from "@/stores/profile-store";
import { useIsModuleEnabled } from "@/hooks/use-modules";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { Button } from "@/components/ui/button";
import {
  calculateGPA,
  calculateSemesterGPA,
  getSortedSemesters,
} from "@/lib/grade-utils";

export function CurrentGPAWidget() {
  const courses = useGradeStore((s) => s.courses);
  const { baseCGPA, baseCredits, semesterUpdates } = useGPAStore();
  const gpaScale = useProfileStore((s) => s.gpaScale);
  const customGpaMax = useProfileStore((s) => s.customGpaMax);
  const gpaEnabled = useIsModuleEnabled("gpa");
  const gradesEnabled = useIsModuleEnabled("grades");

  if (!gpaEnabled && !gradesEnabled) return null;

  const maxGpa =
    gpaScale === "percentage" ? 100
    : gpaScale === "4.3" ? 4.3
    : gpaScale === "custom" ? (customGpaMax ?? 4.0)
    : 4.0;

  // Determine GPA value
  const gradeTrackerResult = gradesEnabled
    ? calculateGPA(courses, gpaScale, customGpaMax)
    : null;

  const manualResult = !gradesEnabled
    ? computeCumulativeGPA(baseCGPA, baseCredits, semesterUpdates)
    : null;

  const gpa = gradesEnabled ? gradeTrackerResult?.gpa ?? null : manualResult?.cgpa ?? null;
  const isEmpty = gpa === null;

  if (isEmpty) {
    return (
      <WidgetCard title="GPA" icon={Calculator}>
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <Calculator className="size-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            Track your grades to see your GPA
          </p>
          <Button
            variant="outline"
            size="sm"
            render={<Link href={gradesEnabled ? "/grades" : "/gpa"} />}
          >
            {gradesEnabled ? "Add Grades" : "Set Up GPA"}
            <ArrowRight className="size-4 ml-1" />
          </Button>
        </div>
      </WidgetCard>
    );
  }

  // Trend — compare last two semesters (grade tracker only)
  let TrendIcon = Minus;
  let trendColor = "text-muted-foreground";

  if (gradesEnabled) {
    const semesters = getSortedSemesters(courses);
    if (semesters.length >= 2) {
      const prev = semesters[semesters.length - 2];
      const curr = semesters[semesters.length - 1];
      const prevGpa = calculateSemesterGPA(courses, prev, gpaScale, customGpaMax);
      const currGpa = calculateSemesterGPA(courses, curr, gpaScale, customGpaMax);
      if (prevGpa && currGpa) {
        if (currGpa.gpa > prevGpa.gpa + 0.01) { TrendIcon = TrendingUp; trendColor = "text-green-500"; }
        else if (currGpa.gpa < prevGpa.gpa - 0.01) { TrendIcon = TrendingDown; trendColor = "text-destructive"; }
      }
    }
  } else if (semesterUpdates.length >= 2) {
    const prev = semesterUpdates[semesterUpdates.length - 2];
    const curr = semesterUpdates[semesterUpdates.length - 1];
    if (curr.sGPA > prev.sGPA + 0.01) { TrendIcon = TrendingUp; trendColor = "text-green-500"; }
    else if (curr.sGPA < prev.sGPA - 0.01) { TrendIcon = TrendingDown; trendColor = "text-destructive"; }
  }

  return (
    <WidgetCard title="GPA" icon={Calculator} href="/gpa">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-3xl font-bold tabular-nums">{gpa!.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">/ {maxGpa} scale</p>
        </div>
        <TrendIcon className={`size-5 ${trendColor}`} />
      </div>
    </WidgetCard>
  );
}
