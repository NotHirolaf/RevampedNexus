"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ModuleGuard } from "@/components/modules/module-guard";
import { useMounted } from "@/hooks/use-hydration";
import { CourseGrid } from "./course-grid";
import { CourseDetail } from "./course-detail";

export function GradesView() {
  const mounted = useMounted();
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <ModuleGuard moduleId="grades">
      {view === "list" ? (
        <CourseGrid
          onSelectCourse={(id) => {
            setSelectedCourseId(id);
            setView("detail");
          }}
        />
      ) : (
        <CourseDetail
          courseId={selectedCourseId!}
          onBack={() => {
            setSelectedCourseId(null);
            setView("list");
          }}
        />
      )}
    </ModuleGuard>
  );
}
