"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  calculateGPA,
  calculateManualGPA,
  calculateSemesterGPA,
  getCourseGrade,
  getLetterGrade,
  getCourseGradePoints,
  getSortedSemesters,
} from "@/lib/grade-utils";
import type { Course, ManualGPAEntry, GpaScale } from "@/types";

interface GpaDisplayProps {
  courses: Course[];
  manualEntries: ManualGPAEntry[];
  useGradeTracker: boolean;
  currentSemester: string;
  gpaScale: GpaScale;
  customGpaMax: number | null;
}

function TrendIndicator({
  current,
  previous,
}: {
  current: number | null;
  previous: number | null;
}) {
  if (!current || !previous) return <Minus className="size-5 text-muted-foreground" />;
  if (current > previous + 0.01) return <TrendingUp className="size-5 text-green-500" />;
  if (current < previous - 0.01) return <TrendingDown className="size-5 text-destructive" />;
  return <Minus className="size-5 text-muted-foreground" />;
}

export function GpaDisplay({
  courses,
  manualEntries,
  useGradeTracker,
  currentSemester,
  gpaScale,
  customGpaMax,
}: GpaDisplayProps) {
  const maxGpa = gpaScale === "percentage" ? 100 : gpaScale === "4.3" ? 4.3 : gpaScale === "custom" ? (customGpaMax ?? 4.0) : 4.0;

  // Compute GPA values
  const cumulativeResult = useGradeTracker
    ? calculateGPA(courses, gpaScale, customGpaMax)
    : calculateManualGPA(manualEntries, gpaScale, customGpaMax);

  const currentResult = useGradeTracker
    ? calculateSemesterGPA(courses, currentSemester, gpaScale, customGpaMax)
    : calculateManualGPA(
        manualEntries.filter((e) => e.semester === currentSemester),
        gpaScale,
        customGpaMax
      );

  // Trend — compare current semester to previous (grade tracker only)
  let previousResult: { gpa: number } | null = null;
  if (useGradeTracker) {
    const semesters = getSortedSemesters(courses);
    const currIdx = semesters.indexOf(currentSemester);
    if (currIdx > 0) {
      previousResult = calculateSemesterGPA(
        courses,
        semesters[currIdx - 1],
        gpaScale,
        customGpaMax
      );
    }
  }

  // Course breakdown for current semester
  const currentSemesterCourses = useGradeTracker
    ? courses.filter((c) => c.semester === currentSemester)
    : [];

  return (
    <div className="space-y-4">
      {/* GPA numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Current semester */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground font-normal uppercase tracking-wide">
              Current Semester
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold tabular-nums">
                {currentResult ? currentResult.gpa.toFixed(2) : "—"}
              </p>
              <div className="pb-1">
                <p className="text-sm text-muted-foreground">/ {maxGpa}</p>
                {currentSemester && (
                  <Badge variant="secondary" className="text-xs mt-0.5">
                    {currentSemester}
                  </Badge>
                )}
              </div>
              <div className="pb-1 ml-auto">
                <TrendIndicator
                  current={currentResult?.gpa ?? null}
                  previous={previousResult?.gpa ?? null}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cumulative */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground font-normal uppercase tracking-wide">
              Cumulative GPA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold tabular-nums">
                {cumulativeResult ? cumulativeResult.gpa.toFixed(2) : "—"}
              </p>
              <div className="pb-1">
                <p className="text-sm text-muted-foreground">/ {maxGpa}</p>
                <p className="text-xs text-muted-foreground mt-0.5">All semesters</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course breakdown for current semester */}
      {useGradeTracker && currentSemesterCourses.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {currentSemester || "Current Semester"} Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left pb-1.5 pr-3 font-normal">Course</th>
                  <th className="text-right pb-1.5 pr-3 font-normal">Grade%</th>
                  <th className="text-right pb-1.5 pr-3 font-normal">Letter</th>
                  <th className="text-right pb-1.5 pr-3 font-normal">Points</th>
                  <th className="text-right pb-1.5 font-normal">Credits</th>
                </tr>
              </thead>
              <tbody>
                {currentSemesterCourses.map((course) => {
                  const g = getCourseGrade(course);
                  const letter = g !== null ? getLetterGrade(g) : "—";
                  const pts = getCourseGradePoints(course, gpaScale, customGpaMax);
                  return (
                    <tr key={course.id} className="border-b last:border-0">
                      <td className="py-1.5 pr-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="size-2 rounded-full shrink-0"
                            style={{ backgroundColor: course.color }}
                          />
                          <span className="truncate">{course.name}</span>
                          <span className="text-muted-foreground text-xs">
                            {course.code}
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">
                        {g !== null ? `${g.toFixed(1)}%` : "—"}
                      </td>
                      <td className="py-1.5 pr-3 text-right">{letter}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">
                        {pts !== null ? pts.toFixed(2) : "—"}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        {course.creditHours}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
