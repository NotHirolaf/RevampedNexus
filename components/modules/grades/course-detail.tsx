"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { getFlatCourseGrade, getFlatCourseStanding, getLetterGrade } from "@/lib/grade-utils";
import { AddCourseModal } from "./add-course-modal";
import { toast } from "sonner";
import type { GradeItem } from "@/types";

interface CourseDetailProps {
  courseId: string;
  onBack: () => void;
}

// ─── Item row ─────────────────────────────────────────────────────────────────

function ItemRow({
  courseId,
  item,
  index,
  total,
}: {
  courseId: string;
  item: GradeItem;
  index: number;
  total: number;
}) {
  const { updateItemFlat, deleteItemFlat, reorderItemsFlat } = useGradeStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [earned, setEarned] = useState(String(item.scoreEarned));
  const [possible, setPossible] = useState(String(item.scorePossible));
  const [weight, setWeight] = useState(item.weight != null ? String(item.weight) : "");

  const pct =
    item.scorePossible > 0
      ? (item.scoreEarned / item.scorePossible) * 100
      : null;

  function save() {
    const e = parseFloat(earned);
    const p = parseFloat(possible);
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (isNaN(e) || e < 0) { toast.error("Invalid score earned"); return; }
    if (isNaN(p) || p <= 0) { toast.error("Possible score must be positive"); return; }
    const w = weight.trim() === "" ? undefined : parseFloat(weight);
    if (w !== undefined && (isNaN(w) || w <= 0)) { toast.error("Weight must be a positive number"); return; }
    updateItemFlat(courseId, item.id, {
      name: name.trim(),
      scoreEarned: e,
      scorePossible: p,
      weight: w,
      date: item.date,
    });
    setEditing(false);
  }

  function cancel() {
    setName(item.name);
    setEarned(String(item.scoreEarned));
    setPossible(String(item.scorePossible));
    setWeight(item.weight != null ? String(item.weight) : "");
    setEditing(false);
  }

  if (editing) {
    return (
      <tr>
        <td className="py-2 pr-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-base" autoFocus />
        </td>
        <td className="py-2 pr-2">
          <div className="flex items-center gap-1">
            <Input type="number" value={earned} onChange={(e) => setEarned(e.target.value)}
              className="h-8 text-sm w-16" min={0} step={0.5} />
            <span className="text-sm text-muted-foreground">/</span>
            <Input type="number" value={possible} onChange={(e) => setPossible(e.target.value)}
              className="h-8 text-sm w-16" min={0} step={0.5} />
          </div>
        </td>
        <td className="py-2 pr-2 w-20">
          <Input type="number" placeholder="—" value={weight} onChange={(e) => setWeight(e.target.value)}
            className="h-8 text-sm w-16" min={0} step={0.5} />
        </td>
        <td className="py-2 pr-2 w-16" />
        <td className="py-2">
          <div className="flex gap-1">
            <Button size="icon-sm" variant="ghost" onClick={save}>
              <Check className="size-3.5 text-green-500" />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={cancel}>
              <X className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="group hover:bg-muted/30 transition-colors">
      <td className="py-2.5 pr-3 text-base font-medium">{item.name}</td>
      <td className="py-2.5 pr-3 text-sm tabular-nums text-muted-foreground whitespace-nowrap">
        {item.scoreEarned} / {item.scorePossible}
      </td>
      <td className="py-2.5 pr-3 text-sm tabular-nums text-muted-foreground">
        {item.weight != null ? `${item.weight}%` : "—"}
      </td>
      <td className="py-2.5 pr-3 text-base tabular-nums font-semibold whitespace-nowrap">
        {pct !== null ? `${pct.toFixed(1)}%` : "—"}
      </td>
      <td className="py-2.5">
        <div className="flex items-center gap-0.5">
          <Button size="icon-sm" variant="ghost" disabled={index === 0}
            onClick={() => reorderItemsFlat(courseId, index, index - 1)}
            className="opacity-40 hover:opacity-100 disabled:opacity-20">
            <ChevronUp className="size-3.5" />
          </Button>
          <Button size="icon-sm" variant="ghost" disabled={index === total - 1}
            onClick={() => reorderItemsFlat(courseId, index, index + 1)}
            className="opacity-40 hover:opacity-100 disabled:opacity-20">
            <ChevronDown className="size-3.5" />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil className="size-3.5" />
          </Button>
          <Button size="icon-sm" variant="ghost"
            onClick={() => { deleteItemFlat(courseId, item.id); toast.success("Item deleted"); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Add item form ────────────────────────────────────────────────────────────

function AddItemForm({ courseId, onDone }: { courseId: string; onDone: () => void }) {
  const { addItemFlat } = useGradeStore();
  const [name, setName] = useState("");
  const [earned, setEarned] = useState("");
  const [possible, setPossible] = useState("");
  const [weight, setWeight] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ea = parseFloat(earned);
    const p = parseFloat(possible);
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (isNaN(ea) || ea < 0) { toast.error("Invalid score earned"); return; }
    if (isNaN(p) || p <= 0) { toast.error("Possible score must be positive"); return; }
    const w = weight.trim() === "" ? undefined : parseFloat(weight);
    if (w !== undefined && (isNaN(w) || w <= 0)) { toast.error("Weight must be a positive number"); return; }
    addItemFlat(courseId, {
      id: crypto.randomUUID(),
      name: name.trim(),
      scoreEarned: ea,
      scorePossible: p,
      weight: w,
      date: "",
    });
    toast.success("Item added");
    setName("");
    setEarned("");
    setPossible("");
    setWeight("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3 border rounded-lg bg-muted/20 mt-2">
      <div className="flex-1 space-y-1">
        <Label className="text-xs">Name</Label>
        <Input placeholder="e.g. Midterm Exam" value={name} onChange={(e) => setName(e.target.value)}
          className="h-9 text-base" autoFocus />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Score</Label>
        <div className="flex items-center gap-1">
          <Input type="number" placeholder="0" value={earned} onChange={(e) => setEarned(e.target.value)}
            className="h-9 w-16 text-sm" min={0} step={0.5} />
          <span className="text-sm text-muted-foreground">/</span>
          <Input type="number" placeholder="100" value={possible} onChange={(e) => setPossible(e.target.value)}
            className="h-9 w-16 text-sm" min={0} step={0.5} />
        </div>
      </div>
      <div className="space-y-1 w-20">
        <Label className="text-xs">Weight %</Label>
        <Input type="number" placeholder="—" value={weight} onChange={(e) => setWeight(e.target.value)}
          className="h-9 text-sm" min={0} step={0.5} />
      </div>
      <Button type="submit" size="sm" className="h-9">Add</Button>
      <Button type="button" size="sm" variant="ghost" className="h-9" onClick={onDone}>Done</Button>
    </form>
  );
}

// ─── Final grade calculator ───────────────────────────────────────────────────

function FinalGradeCalculator({ currentGrade, mode }: { currentGrade: number | null; mode: "performance" | "standing" }) {
  const [open, setOpen] = useState(false);
  const [finalWeight, setFinalWeight] = useState(30);
  const [targetGrade, setTargetGrade] = useState(85);

  // current grade is fixed from the tracker — strip the final exam weight out first
  // Formula: needed = (target - currentGrade * (1 - finalWeight/100)) / (finalWeight/100)
  const gradeBeforeFinal =
    currentGrade !== null && finalWeight < 100
      ? (currentGrade / (1 - finalWeight / 100)) * (1 - finalWeight / 100)
      : currentGrade;

  const needed =
    currentGrade !== null && finalWeight > 0
      ? (targetGrade - currentGrade * (1 - finalWeight / 100)) / (finalWeight / 100)
      : null;

  function resultContent() {
    if (currentGrade === null) return <p className="text-sm text-muted-foreground">Add items above to compute your current grade first.</p>;
    if (needed === null) return <p className="text-sm text-muted-foreground">Set a final exam weight above 0%.</p>;
    if (needed <= 0) return <p className="text-sm text-green-600 dark:text-green-400">You&apos;ve already secured {targetGrade}% — no minimum needed on the final.</p>;
    if (needed > 120) return <p className="text-sm text-destructive">Not achievable — you would need <strong>{needed.toFixed(1)}%</strong>, which exceeds 100%. Lower your target.</p>;
    if (needed > 100) return <p className="text-sm text-amber-600 dark:text-amber-400">Very challenging — you need <strong>{needed.toFixed(1)}%</strong> on the final to reach {targetGrade}%.</p>;
    return (
      <p className="text-sm">
        You need at least{" "}
        <strong className="text-foreground text-base">{needed.toFixed(1)}%</strong>{" "}
        on the final to achieve <strong>{targetGrade}%</strong> overall.
      </p>
    );
  }

  return (
    <>
      <Separator />
      <Card>
        <CardHeader className="pb-2">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center justify-between w-full text-left"
            aria-expanded={open}
          >
            <CardTitle className="text-sm flex items-center gap-2">
              <Calculator className="size-4 text-muted-foreground" />
              Final Grade Calculator
            </CardTitle>
            <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-150 ${open ? "" : "-rotate-90"}`} />
          </button>
        </CardHeader>

        {open && (
          <CardContent className="space-y-4">
            {/* Current grade display (read-only, live from tracker) */}
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
              <span className="text-sm text-muted-foreground">
                {mode === "standing" ? "Course standing (from tracker)" : "Current performance (from tracker)"}
              </span>
              <span className="text-base font-semibold tabular-nums">
                {currentGrade !== null ? `${currentGrade.toFixed(1)}%` : "—"}
              </span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Final exam weight</Label>
                <div className="flex items-center gap-3">
                  <input type="range" min={1} max={100} value={finalWeight}
                    onChange={(e) => setFinalWeight(Number(e.target.value))}
                    className="flex-1 accent-primary" />
                  <Input type="number" value={finalWeight}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val > 100) { toast.error("Final exam weight cannot exceed 100%"); return; }
                      setFinalWeight(Math.max(1, val));
                    }}
                    min={1} max={100} className="w-16 h-7 text-sm" />
                  <span className="text-sm text-muted-foreground w-4">%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Target overall grade</Label>
                <div className="flex items-center gap-3">
                  <input type="range" min={50} max={100} value={targetGrade}
                    onChange={(e) => setTargetGrade(Number(e.target.value))}
                    className="flex-1 accent-primary" />
                  <Input type="number" value={targetGrade}
                    onChange={(e) => setTargetGrade(Math.max(50, Math.min(100, Number(e.target.value))))}
                    min={50} max={100} className="w-16 h-7 text-sm" />
                  <span className="text-sm text-muted-foreground w-4">%</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-3 bg-muted/50">{resultContent()}</div>
          </CardContent>
        )}
      </Card>
    </>
  );
}

// ─── Course detail ────────────────────────────────────────────────────────────

export function CourseDetail({ courseId, onBack }: CourseDetailProps) {
  const courses = useGradeStore((s) => s.courses);
  const deleteCourse = useGradeStore((s) => s.deleteCourse);

  const course = courses.find((c) => c.id === courseId);
  const [editOpen, setEditOpen] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [gradeMode, setGradeMode] = useState<"performance" | "standing">("performance");

  if (!course) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Course not found.{" "}
        <button onClick={onBack} className="underline">Go back</button>
      </div>
    );
  }

  const allItems = course.categories.flatMap((c) => c.items);
  const performanceGrade = getFlatCourseGrade(course);
  const standingGrade = getFlatCourseStanding(course);
  const canUseStanding = standingGrade !== null;

  // Active grade used for display and the Final Grade Calculator
  const grade = gradeMode === "standing" && canUseStanding ? standingGrade : performanceGrade;
  const letter = grade !== null ? getLetterGrade(grade) : "—";
  const gradeDisplay = grade !== null ? `${grade.toFixed(1)}%` : "—";

  // Warn if weights are mixed (some set, some not)
  const itemsWithWeight = allItems.filter((i) => i.weight != null && i.weight > 0);
  const mixedWeights = itemsWithWeight.length > 0 && itemsWithWeight.length < allItems.length;

  function handleDelete() {
    deleteCourse(course!.id);
    toast.success("Course deleted");
    onBack();
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
            <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: course.color }} />
            <h1 className="text-xl font-semibold truncate">{course.name}</h1>
            <Badge variant="secondary">{course.code}</Badge>
            <span className="text-sm text-muted-foreground">{course.semester}</span>
            <span className="text-sm text-muted-foreground">· {course.creditHours} cr</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="text-2xl font-bold tabular-nums">{gradeDisplay}</div>
            <div className="text-xl font-semibold text-muted-foreground">{letter}</div>
          </div>
          {grade !== null && (
            <div className="mt-1.5 h-2 bg-muted rounded-full overflow-hidden w-full max-w-xs">
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, grade)}%`, backgroundColor: course.color }} />
            </div>
          )}

          {/* Mode toggle */}
          <div className="mt-3 flex gap-1 p-0.5 bg-muted rounded-lg w-fit text-xs font-medium">
            <button
              onClick={() => setGradeMode("performance")}
              className={`px-3 py-1 rounded-md transition-all ${
                gradeMode === "performance"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Performance
            </button>
            <button
              onClick={() => setGradeMode("standing")}
              disabled={!canUseStanding}
              title={!canUseStanding ? "Add weights to items to enable course standing" : undefined}
              className={`px-3 py-1 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                gradeMode === "standing"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Course Standing
            </button>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <Trash2 className="size-4 text-destructive" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete course?</AlertDialogTitle>
                <AlertDialogDescription>
                  "{course.name}" and all its items will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Mixed weight warning */}
      {mixedWeights && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          Some items have a weight and some don&apos;t. Unweighted items count as weight&nbsp;1.
        </div>
      )}

      {/* Items */}
      {allItems.length === 0 && !addingItem ? (
        <div className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground">
          <p className="text-sm">No items yet.</p>
          <p className="text-xs mt-1">Add assignments, quizzes, or exams to track your grade.</p>
          <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => setAddingItem(true)}>
            <Plus className="size-4" />
            Add Item
          </Button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left pb-2 pr-3 font-normal">Name</th>
                  <th className="text-left pb-2 pr-3 font-normal w-32">Score</th>
                  <th className="text-left pb-2 pr-3 font-normal w-20">Weight</th>
                  <th className="text-left pb-2 pr-3 font-normal w-16">Grade</th>
                  <th className="pb-2 w-28" />
                </tr>
              </thead>
              <tbody>
                {allItems.map((item, i) => (
                  <ItemRow
                    key={item.id}
                    courseId={course.id}
                    item={item}
                    index={i}
                    total={allItems.length}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {addingItem ? (
            <AddItemForm courseId={course.id} onDone={() => setAddingItem(false)} />
          ) : (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setAddingItem(true)}>
              <Plus className="size-4" />
              Add Item
            </Button>
          )}
        </>
      )}

      {/* Final grade calculator — uses live grade from tracker */}
      <FinalGradeCalculator currentGrade={grade} mode={gradeMode} />

      {/* Edit course modal */}
      <AddCourseModal open={editOpen} onOpenChange={setEditOpen} editCourse={course} />
    </div>
  );
}
