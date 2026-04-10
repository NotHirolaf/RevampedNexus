"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGPAStore } from "@/stores/useGPAStore";
import { useProfileStore } from "@/stores/profile-store";
import { toast } from "sonner";
import type { ManualGPAEntry } from "@/types";

const LETTER_GRADES = [
  "A+", "A", "A-",
  "B+", "B", "B-",
  "C+", "C", "C-",
  "D+", "D", "D-",
  "F",
];

function EntryRow({ entry }: { entry: ManualGPAEntry }) {
  const updateManualEntry = useGPAStore((s) => s.updateManualEntry);
  const removeManualEntry = useGPAStore((s) => s.removeManualEntry);

  return (
    <tr className="border-b last:border-0">
      <td className="py-1.5 pr-2">
        <Input
          value={entry.courseName}
          onChange={(e) =>
            updateManualEntry(entry.id, { courseName: e.target.value })
          }
          className="h-7 text-sm"
          placeholder="Course name"
        />
      </td>
      <td className="py-1.5 pr-2 w-20">
        <Input
          type="number"
          value={entry.creditHours}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v) && v > 0) updateManualEntry(entry.id, { creditHours: v });
          }}
          min={0.5}
          step={0.5}
          className="h-7 text-sm w-full"
        />
      </td>
      <td className="py-1.5 pr-2 w-24">
        <Select
          value={entry.letterGrade}
          onValueChange={(v) => updateManualEntry(entry.id, { letterGrade: v })}
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
          onChange={(e) =>
            updateManualEntry(entry.id, { semester: e.target.value })
          }
          className="h-7 text-sm"
          placeholder="e.g. Fall 2025"
        />
      </td>
      <td className="py-1.5">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => {
            removeManualEntry(entry.id);
            toast.success("Entry removed");
          }}
        >
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </td>
    </tr>
  );
}

export function ManualEntrySection() {
  const entries = useGPAStore((s) => s.manualEntries);
  const addManualEntry = useGPAStore((s) => s.addManualEntry);
  const defaultSemester = useProfileStore((s) => s.semester);

  function handleAdd() {
    addManualEntry({
      id: crypto.randomUUID(),
      courseName: "",
      creditHours: 3,
      letterGrade: "A",
      semester: defaultSemester,
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Grade Entries</CardTitle>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handleAdd}>
            <Plus className="size-3.5" />
            Add Course
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No entries yet. Add a course to calculate your GPA.
          </div>
        ) : (
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
                {entries.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
