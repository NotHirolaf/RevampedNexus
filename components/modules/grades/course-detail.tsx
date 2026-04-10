"use client";

import { useState } from "react";
import { ArrowLeft, Pencil, Trash2, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useGradeStore } from "@/stores/useGradeStore";
import { getCourseGrade, getLetterGrade } from "@/lib/grade-utils";
import { CategorySection } from "./category-section";
import { AddCourseModal } from "./add-course-modal";
import { WhatDoINeed } from "./what-do-i-need";
import { toast } from "sonner";

interface CourseDetailProps {
  courseId: string;
  onBack: () => void;
}

export function CourseDetail({ courseId, onBack }: CourseDetailProps) {
  const courses = useGradeStore((s) => s.courses);
  const addCategory = useGradeStore((s) => s.addCategory);
  const deleteCourse = useGradeStore((s) => s.deleteCourse);

  const course = courses.find((c) => c.id === courseId);

  const [editOpen, setEditOpen] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatWeight, setNewCatWeight] = useState("");

  if (!course) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Course not found.{" "}
        <button onClick={onBack} className="underline">
          Go back
        </button>
      </div>
    );
  }

  const grade = getCourseGrade(course);
  const letter = grade !== null ? getLetterGrade(grade) : "—";
  const gradeDisplay = grade !== null ? `${grade.toFixed(1)}%` : "—";

  const totalWeight = course.categories.reduce((s, c) => s + c.weight, 0);
  const weightOk = Math.abs(totalWeight - 100) < 0.01;

  function handleDelete() {
    deleteCourse(course!.id);
    toast.success("Course deleted");
    onBack();
  }

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(newCatWeight);
    if (!newCatName.trim()) { toast.error("Category name is required"); return; }
    if (isNaN(w) || w < 0 || w > 100) { toast.error("Weight must be 0–100"); return; }
    addCategory(course!.id, {
      id: crypto.randomUUID(),
      name: newCatName.trim(),
      weight: w,
      items: [],
    });
    setNewCatName("");
    setNewCatWeight("");
    setAddingCategory(false);
    toast.success("Category added");
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon-sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className="size-3 rounded-full shrink-0"
              style={{ backgroundColor: course.color }}
            />
            <h1 className="text-xl font-semibold truncate">{course.name}</h1>
            <Badge variant="secondary">{course.code}</Badge>
            <span className="text-sm text-muted-foreground">{course.semester}</span>
            <span className="text-sm text-muted-foreground">
              · {course.creditHours} cr
            </span>
          </div>
          {/* Overall grade bar */}
          <div className="mt-3 flex items-center gap-3">
            <div className="text-2xl font-bold tabular-nums">{gradeDisplay}</div>
            <div className="text-xl font-semibold text-muted-foreground">{letter}</div>
          </div>
          {grade !== null && (
            <div className="mt-1.5 h-2 bg-muted rounded-full overflow-hidden w-full max-w-xs">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, grade)}%`,
                  backgroundColor: course.color,
                }}
              />
            </div>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <Trash2 className="size-4 text-destructive" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete course?</AlertDialogTitle>
                <AlertDialogDescription>
                  "{course.name}" and all its categories and items will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Weight warning */}
      {course.categories.length > 0 && !weightOk && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="size-4 shrink-0" />
          Category weights sum to {totalWeight}% (not 100%). Adjust them for an
          accurate grade.
        </div>
      )}

      {/* Categories */}
      {course.categories.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="text-sm">No categories yet.</p>
          <p className="text-xs mt-1">
            Add categories like "Assignments", "Midterm", or "Final Exam".
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {course.categories.map((cat) => (
            <CategorySection key={cat.id} courseId={course.id} category={cat} />
          ))}
        </div>
      )}

      {/* Add category */}
      {addingCategory ? (
        <form
          onSubmit={handleAddCategory}
          className="flex items-end gap-2 p-3 border rounded-lg bg-muted/20"
        >
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Category name</Label>
            <Input
              placeholder="e.g. Assignments"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="h-8"
              autoFocus
            />
          </div>
          <div className="w-24 space-y-1">
            <Label className="text-xs">Weight (%)</Label>
            <Input
              type="number"
              placeholder="25"
              value={newCatWeight}
              onChange={(e) => setNewCatWeight(e.target.value)}
              min={0}
              max={100}
              className="h-8"
            />
          </div>
          <Button type="submit" size="sm">
            Add
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setAddingCategory(false)}
          >
            Cancel
          </Button>
        </form>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setAddingCategory(true)}
        >
          <Plus className="size-4" />
          Add Category
        </Button>
      )}

      {/* What Do I Need calculator */}
      <WhatDoINeed course={course} />

      {/* Edit modal */}
      <AddCourseModal
        open={editOpen}
        onOpenChange={setEditOpen}
        editCourse={course}
      />
    </div>
  );
}
