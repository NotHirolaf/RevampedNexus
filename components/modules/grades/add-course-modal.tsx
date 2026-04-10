"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGradeStore } from "@/stores/useGradeStore";
import { useProfileStore } from "@/stores/profile-store";
import { toast } from "sonner";
import type { Course } from "@/types";

const PRESET_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#ef4444", // red
];

interface AddCourseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCourse?: Course | null;
}

export function AddCourseModal({
  open,
  onOpenChange,
  editCourse,
}: AddCourseModalProps) {
  const addCourse = useGradeStore((s) => s.addCourse);
  const updateCourse = useGradeStore((s) => s.updateCourse);
  const defaultSemester = useProfileStore((s) => s.semester);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [creditHours, setCreditHours] = useState("3");
  const [semester, setSemester] = useState(defaultSemester);
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [customHex, setCustomHex] = useState("");

  const isEdit = !!editCourse;

  // Populate form when editing
  useEffect(() => {
    if (editCourse) {
      setName(editCourse.name);
      setCode(editCourse.code);
      setCreditHours(String(editCourse.creditHours));
      setSemester(editCourse.semester);
      setColor(editCourse.color);
      setCustomHex(PRESET_COLORS.includes(editCourse.color) ? "" : editCourse.color);
    } else {
      setName("");
      setCode("");
      setCreditHours("3");
      setSemester(defaultSemester);
      setColor(PRESET_COLORS[0]);
      setCustomHex("");
    }
  }, [editCourse, defaultSemester, open]);

  function handleCustomHex(val: string) {
    setCustomHex(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      setColor(val);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const credits = parseFloat(creditHours);
    if (!name.trim()) { toast.error("Course name is required"); return; }
    if (!code.trim()) { toast.error("Course code is required"); return; }
    if (isNaN(credits) || credits <= 0) { toast.error("Credit hours must be positive"); return; }
    if (!semester.trim()) { toast.error("Semester is required"); return; }

    const finalColor = /^#[0-9a-fA-F]{6}$/.test(customHex) ? customHex : color;

    if (isEdit && editCourse) {
      updateCourse(editCourse.id, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        creditHours: credits,
        semester: semester.trim(),
        color: finalColor,
      });
      toast.success("Course updated");
    } else {
      addCourse({
        id: crypto.randomUUID(),
        name: name.trim(),
        code: code.trim().toUpperCase(),
        creditHours: credits,
        semester: semester.trim(),
        color: finalColor,
        categories: [],
      });
      toast.success("Course added");
    }

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Course" : "Add Course"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="course-name">Course Name *</Label>
            <Input
              id="course-name"
              placeholder="e.g. Introduction to Algorithms"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="course-code">Course Code *</Label>
              <Input
                id="course-code"
                placeholder="e.g. CS301"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="credit-hours">Credit Hours *</Label>
              <Input
                id="credit-hours"
                type="number"
                placeholder="3"
                value={creditHours}
                onChange={(e) => setCreditHours(e.target.value)}
                min={0.5}
                step={0.5}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="semester">Semester *</Label>
            <Input
              id="semester"
              placeholder="e.g. Fall 2025"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setColor(c); setCustomHex(""); }}
                  className={`size-8 rounded-full border-2 transition-all ${
                    color === c && !customHex
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div
                className="size-8 rounded-full border-2 shrink-0"
                style={{
                  backgroundColor: /^#[0-9a-fA-F]{6}$/.test(customHex) ? customHex : "transparent",
                  borderColor: customHex ? "currentColor" : "hsl(var(--border))",
                }}
              />
              <Input
                placeholder="Custom hex (#rrggbb)"
                value={customHex}
                onChange={(e) => handleCustomHex(e.target.value)}
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">{isEdit ? "Save Changes" : "Add Course"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
