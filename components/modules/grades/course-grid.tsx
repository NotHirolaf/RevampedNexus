"use client";

import { useState } from "react";
import { GraduationCap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGradeStore } from "@/stores/useGradeStore";
import { getFlatCourseGrade, getLetterGrade } from "@/lib/grade-utils";
import { AddCourseModal } from "./add-course-modal";
import type { Course } from "@/types";

interface CourseGridProps {
  onSelectCourse: (id: string) => void;
}

function CourseCard({
  course,
  onClick,
}: {
  course: Course;
  onClick: () => void;
}) {
  const grade = getFlatCourseGrade(course);
  const letter = grade !== null ? getLetterGrade(grade) : null;
  const gradeDisplay = grade !== null ? `${grade.toFixed(1)}%` : "—";
  const itemCount = course.categories.reduce((s, c) => s + c.items.length, 0);

  return (
    <button
      onClick={onClick}
      className="group text-left w-full rounded-xl border bg-card hover:bg-muted/30 transition-colors overflow-hidden"
    >
      <div className="flex">
        {/* Color indicator */}
        <div
          className="w-1.5 shrink-0"
          style={{ backgroundColor: course.color }}
        />
        <div className="flex-1 p-4 space-y-3">
          {/* Course info */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{course.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {course.code} · {course.semester}
              </p>
            </div>
            <Badge variant="outline" className="shrink-0 text-xs">
              {course.creditHours} cr
            </Badge>
          </div>

          {/* Grade display */}
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-2xl font-bold tabular-nums">{gradeDisplay}</p>
              {letter && (
                <p className="text-sm text-muted-foreground">{letter}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground pb-0.5">
              {itemCount === 0
                ? "No items"
                : `${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            </p>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: grade !== null ? `${Math.min(100, grade)}%` : "0%",
                backgroundColor: course.color,
              }}
            />
          </div>
        </div>
      </div>
    </button>
  );
}

export function CourseGrid({ onSelectCourse }: CourseGridProps) {
  const courses = useGradeStore((s) => s.courses);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Grade Tracker</h1>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Add Course
        </Button>
      </div>

      {/* Course grid or empty state */}
      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
          <GraduationCap className="size-12 text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No courses yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Add your first course to start tracking grades
          </p>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="size-4" />
            Add your first course
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onClick={() => onSelectCourse(course.id)}
            />
          ))}
        </div>
      )}

      <AddCourseModal open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
