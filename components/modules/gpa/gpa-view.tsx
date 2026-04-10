"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ModuleGuard } from "@/components/modules/module-guard";
import { useMounted } from "@/hooks/use-hydration";
import { useIsModuleEnabled } from "@/hooks/use-modules";
import { useGradeStore } from "@/stores/useGradeStore";
import { useGPAStore } from "@/stores/useGPAStore";
import { useProfileStore } from "@/stores/profile-store";
import { getSortedSemesters } from "@/lib/grade-utils";
import { GpaDisplay } from "./gpa-display";
import { SemesterChart } from "./semester-chart";
import { ManualEntrySection } from "./manual-entry-section";
import { WhatIfPlanner } from "./what-if-planner";
import { FinalExamCalculator } from "./final-exam-calculator";
import {
  calculateGPA,
  calculateManualGPA,
  calculateSemesterGPA,
} from "@/lib/grade-utils";

export function GpaView() {
  const mounted = useMounted();
  const gradesEnabled = useIsModuleEnabled("grades");
  const courses = useGradeStore((s) => s.courses);
  const manualEntries = useGPAStore((s) => s.manualEntries);
  const gpaScale = useProfileStore((s) => s.gpaScale);
  const customGpaMax = useProfileStore((s) => s.customGpaMax);
  const currentSemester = useProfileStore((s) => s.semester);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  const useGradeTracker = gradesEnabled;

  // Build semester chart data
  const semesterChartData = (() => {
    if (useGradeTracker) {
      const semesters = getSortedSemesters(courses);
      return semesters.map((sem) => {
        const r = calculateSemesterGPA(courses, sem, gpaScale, customGpaMax);
        return {
          label: sem,
          gpa: r?.gpa ?? 0,
          maxGpa: r?.maxGpa ?? 4.0,
        };
      });
    }
    const semesters = [...new Set(manualEntries.map((e) => e.semester))].sort();
    return semesters.map((sem) => {
      const filtered = manualEntries.filter((e) => e.semester === sem);
      const r = calculateManualGPA(filtered, gpaScale, customGpaMax);
      return {
        label: sem,
        gpa: r?.gpa ?? 0,
        maxGpa: r?.maxGpa ?? 4.0,
      };
    });
  })();

  return (
    <ModuleGuard moduleId="gpa">
      <div className="space-y-4">
        {/* Page title */}
        <h1 className="text-2xl font-bold">GPA Calculator</h1>

        {/* Auto-sync banner */}
        {gradesEnabled && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 px-3 py-2 text-sm text-blue-700 dark:text-blue-400">
            <RefreshCw className="size-4 shrink-0" />
            <span>
              GPA auto-synced from Grade Tracker —{" "}
              <Link
                href="/grades"
                className="underline underline-offset-2 hover:opacity-80"
              >
                manage grades
              </Link>
            </span>
          </div>
        )}

        {/* GPA display */}
        <GpaDisplay
          courses={courses}
          manualEntries={manualEntries}
          useGradeTracker={useGradeTracker}
          currentSemester={currentSemester}
          gpaScale={gpaScale}
          customGpaMax={customGpaMax}
        />

        {/* Semester chart */}
        {semesterChartData.length > 0 && (
          <SemesterChart semesters={semesterChartData} />
        )}

        {/* Manual entry (only when Grade Tracker disabled) */}
        {!gradesEnabled && <ManualEntrySection />}

        {/* What-If planner */}
        <WhatIfPlanner
          courses={courses}
          manualEntries={manualEntries}
          useGradeTracker={useGradeTracker}
          gpaScale={gpaScale}
          customGpaMax={customGpaMax}
        />

        {/* Final Exam Calculator */}
        <FinalExamCalculator />
      </div>
    </ModuleGuard>
  );
}
