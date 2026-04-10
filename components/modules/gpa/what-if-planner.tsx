"use client";

import { Plus, Trash2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGPAStore } from "@/stores/useGPAStore";
import { useProfileStore } from "@/stores/profile-store";
import {
  getCourseGrade,
  getLetterGrade,
  calculateManualGPA,
} from "@/lib/grade-utils";
import { toast } from "sonner";
import type { Course, ManualGPAEntry, WhatIfEntry, GpaScale } from "@/types";

const LETTER_GRADES = [
  "A+", "A", "A-",
  "B+", "B", "B-",
  "C+", "C", "C-",
  "D+", "D", "D-",
  "F",
];

interface WhatIfPlannerProps {
  courses: Course[];
  manualEntries: ManualGPAEntry[];
  useGradeTracker: boolean;
  gpaScale: GpaScale;
  customGpaMax: number | null;
}

function WhatIfRow({ entry }: { entry: WhatIfEntry }) {
  const updateWhatIfEntry = useGPAStore((s) => s.updateWhatIfEntry);
  const removeWhatIfEntry = useGPAStore((s) => s.removeWhatIfEntry);

  return (
    <tr className="italic bg-muted/40">
      <td className="py-1.5 pr-2">
        <Input
          value={entry.courseName}
          onChange={(e) => updateWhatIfEntry(entry.id, { courseName: e.target.value })}
          className="h-7 text-sm italic"
          placeholder="Hypothetical course"
        />
      </td>
      <td className="py-1.5 pr-2 w-20">
        <Input
          type="number"
          value={entry.creditHours}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v) && v > 0) updateWhatIfEntry(entry.id, { creditHours: v });
          }}
          min={0.5}
          step={0.5}
          className="h-7 text-sm w-full"
        />
      </td>
      <td className="py-1.5 pr-2 w-24">
        <Select
          value={entry.letterGrade}
          onValueChange={(v) => updateWhatIfEntry(entry.id, { letterGrade: v })}
        >
          <SelectTrigger className="h-7 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LETTER_GRADES.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="py-1.5 pr-2">
        <Input
          value={entry.semester}
          onChange={(e) => updateWhatIfEntry(entry.id, { semester: e.target.value })}
          className="h-7 text-sm italic"
          placeholder="e.g. Spring 2026"
        />
      </td>
      <td className="py-1.5">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => removeWhatIfEntry(entry.id)}
        >
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </td>
    </tr>
  );
}

/** Convert courses to ManualGPAEntry format for merged GPA calculation */
function coursesToManualEntries(courses: Course[]): ManualGPAEntry[] {
  return courses.flatMap((c) => {
    const grade = getCourseGrade(c);
    if (grade === null) return [];
    return [
      {
        id: c.id,
        courseName: c.name,
        creditHours: c.creditHours,
        letterGrade: getLetterGrade(grade),
        semester: c.semester,
      },
    ];
  });
}

export function WhatIfPlanner({
  courses,
  manualEntries,
  useGradeTracker,
  gpaScale,
  customGpaMax,
}: WhatIfPlannerProps) {
  const whatIfEntries = useGPAStore((s) => s.whatIfEntries);
  const addWhatIfEntry = useGPAStore((s) => s.addWhatIfEntry);
  const clearWhatIf = useGPAStore((s) => s.clearWhatIf);
  const defaultSemester = useProfileStore((s) => s.semester);

  // Projected GPA: real entries + what-if entries merged
  const projectedResult = (() => {
    if (whatIfEntries.length === 0) return null;
    const realAsManual = useGradeTracker
      ? coursesToManualEntries(courses)
      : manualEntries;
    const combined: ManualGPAEntry[] = [
      ...realAsManual,
      ...whatIfEntries.map((e) => ({
        id: e.id,
        courseName: e.courseName,
        creditHours: e.creditHours,
        letterGrade: e.letterGrade,
        semester: e.semester,
      })),
    ];
    return calculateManualGPA(combined, gpaScale, customGpaMax);
  })();

  function handleAdd() {
    addWhatIfEntry({
      id: crypto.randomUUID(),
      courseName: "",
      creditHours: 3,
      letterGrade: "B",
      semester: defaultSemester,
    });
  }

  return (
    <div>
      <Separator className="mb-4" />

      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">What-If Scenario Planner</h3>
            <Badge variant="secondary" className="text-xs">Hypothetical</Badge>
          </div>
          <div className="flex gap-2">
            {whatIfEntries.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-muted-foreground"
                onClick={() => {
                  clearWhatIf();
                  toast.success("What-If entries cleared");
                }}
              >
                <X className="size-3.5" />
                Clear All
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleAdd}>
              <Plus className="size-3.5" />
              Add Hypothetical Course
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Add hypothetical future courses to see how they would affect your
          cumulative GPA. These entries never affect your real data.
        </p>

        <div className="border-2 border-dashed rounded-lg p-3 space-y-3">
          {whatIfEntries.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              No hypothetical courses yet.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b">
                      <th className="text-left pb-1.5 pr-2 font-normal">Course</th>
                      <th className="text-left pb-1.5 pr-2 font-normal w-20">Credits</th>
                      <th className="text-left pb-1.5 pr-2 font-normal w-24">Grade</th>
                      <th className="text-left pb-1.5 pr-2 font-normal">Semester</th>
                      <th className="pb-1.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {whatIfEntries.map((entry) => (
                      <WhatIfRow key={entry.id} entry={entry} />
                    ))}
                  </tbody>
                </table>
              </div>

              {projectedResult && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2">
                  <Sparkles className="size-4 text-muted-foreground shrink-0" />
                  <p className="text-sm">
                    Projected cumulative GPA:{" "}
                    <strong className="tabular-nums">
                      {projectedResult.gpa.toFixed(2)}
                    </strong>{" "}
                    <span className="text-muted-foreground">
                      / {projectedResult.maxGpa}
                    </span>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
