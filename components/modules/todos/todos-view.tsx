"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  RefreshCw,
  AlertTriangle,
  X,
  Calendar,
  Clock,
  AlignLeft,
  Flame,
  CalendarDays,
  Inbox,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CanvasBadge } from "@/components/ui/canvas-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ModuleGuard } from "@/components/modules/module-guard";
import { useMounted } from "@/hooks/use-hydration";
import { useTodoStore } from "@/stores/useTodoStore";
import { useGradeStore } from "@/stores/useGradeStore";
import { useCanvasStore } from "@/stores/useCanvasStore";
import { useModuleStore } from "@/stores/module-store";
import { cn } from "@/lib/utils";
import type { TodoItem, TodoPriority } from "@/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTodayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDueLabel(iso: string | null): {
  label: string;
  overdue: boolean;
  today: boolean;
  hasTime: boolean;
} {
  if (!iso) return { label: "", overdue: false, today: false, hasTime: false };
  const date = new Date(iso);
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  const dueDay = new Date(iso);
  dueDay.setHours(0, 0, 0, 0);
  const today = getTodayStart();
  const diff = Math.round(
    (dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  let dayLabel: string;
  let overdue = false;
  let isToday = false;
  if (diff < 0) {
    dayLabel = "Overdue";
    overdue = true;
  } else if (diff === 0) {
    dayLabel = "Today";
    isToday = true;
    if (hasTime && date.getTime() < Date.now()) overdue = true;
  } else if (diff === 1) {
    dayLabel = "Tomorrow";
  } else {
    dayLabel = date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  const timeLabel = hasTime
    ? date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return {
    label: timeLabel ? `${dayLabel} · ${timeLabel}` : dayLabel,
    overdue,
    today: isToday,
    hasTime,
  };
}

function dateOffsetISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const PRIORITY_COLORS: Record<TodoPriority, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#ef4444",
  urgent: "#b91c1c",
};

// ─── PriorityToggle (edit mode) ──────────────────────────────────────────────

function PriorityToggle({
  value,
  onChange,
}: {
  value: TodoPriority;
  onChange: (p: TodoPriority) => void;
}) {
  const opts: TodoPriority[] = ["low", "medium", "high"];
  return (
    <div className="inline-flex rounded-lg border border-input p-0.5">
      {opts.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors",
            value === p
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          style={
            value === p
              ? { boxShadow: `inset 3px 0 0 ${PRIORITY_COLORS[p]}` }
              : undefined
          }
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// ─── AddTaskModal ────────────────────────────────────────────────────────────

type DatePreset = "none" | "today" | "tomorrow" | "week" | "custom";

const DATE_PRESETS: { id: DatePreset; label: string; offset?: number }[] = [
  { id: "none",     label: "No date" },
  { id: "today",    label: "Today",     offset: 0 },
  { id: "tomorrow", label: "Tomorrow",  offset: 1 },
  { id: "week",     label: "Next week", offset: 7 },
  { id: "custom",   label: "Pick date" },
];

const PRIORITY_OPTS: { value: TodoPriority; label: string; emoji: string }[] = [
  { value: "low",    label: "Low",    emoji: "🟢" },
  { value: "medium", label: "Medium", emoji: "🟡" },
  { value: "high",   label: "High",   emoji: "🔴" },
];

type TimePreset =
  | "allday"
  | "morning"
  | "noon"
  | "afternoon"
  | "evening"
  | "custom";

const TIME_PRESETS: { id: TimePreset; label: string; value?: string }[] = [
  { id: "allday",    label: "All day" },
  { id: "morning",   label: "9:00 AM",  value: "09:00" },
  { id: "noon",      label: "12:00 PM", value: "12:00" },
  { id: "afternoon", label: "3:00 PM",  value: "15:00" },
  { id: "evening",   label: "6:00 PM",  value: "18:00" },
  { id: "custom",    label: "Custom" },
];

const chipBase =
  "px-3.5 py-1.5 rounded-full text-sm font-medium transition-all select-none";
const chipActive = "bg-primary text-primary-foreground shadow-sm";
const chipIdle =
  "bg-muted/60 dark:bg-muted/30 text-foreground hover:bg-muted cursor-pointer";

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  showCourseField: boolean;
  courseOptions: { id: string; name: string; color: string }[];
}

function AddTaskModal({
  open,
  onOpenChange,
  showCourseField,
  courseOptions,
}: AddTaskModalProps) {
  const addTodo = useTodoStore((s) => s.addTodo);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("medium");
  const [datePreset, setDatePreset] = useState<DatePreset>("none");
  const [customDate, setCustomDate] = useState("");
  const [timePreset, setTimePreset] = useState<TimePreset>("allday");
  const [customTime, setCustomTime] = useState("");
  const [courseId, setCourseId] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  function resolvedTime(): string | null {
    if (timePreset === "allday") return null;
    if (timePreset === "custom") return customTime || null;
    const preset = TIME_PRESETS.find((p) => p.id === timePreset);
    return preset?.value ?? null;
  }

  function resolvedDueDate(): string | null {
    if (datePreset === "none") return null;
    let dateStr: string;
    if (datePreset === "custom") {
      if (!customDate) return null;
      dateStr = customDate;
    } else {
      const preset = DATE_PRESETS.find((p) => p.id === datePreset);
      if (preset?.offset === undefined) return null;
      dateStr = dateOffsetISO(preset.offset);
    }
    const d = new Date(dateStr + "T00:00:00");
    const time = resolvedTime();
    if (time) {
      const [h, m] = time.split(":").map(Number);
      d.setHours(h, m, 0, 0);
    }
    return d.toISOString();
  }

  function reset() {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDatePreset("none");
    setCustomDate("");
    setTimePreset("allday");
    setCustomTime("");
    setCourseId("");
    setShowNotes(false);
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  function handleSubmit() {
    const t = title.trim();
    if (!t) return;
    addTodo({
      id: crypto.randomUUID(),
      title: t,
      description: description.trim(),
      priority,
      status: "pending",
      dueDate: resolvedDueDate(),
      courseId: courseId || null,
      createdAt: new Date().toISOString(),
      completedAt: null,
      source: "manual",
      canvasAssignmentId: null,
      canvasCourseId: null,
      canvasUrl: null,
    });
    toast.success("Task added");
    handleClose();
  }

  const selectedCourse = courseOptions.find((c) => c.id === courseId);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl border-0 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="bg-card px-6 py-7 space-y-5">
          {/* Header */}
          <DialogHeader className="text-center items-center gap-2 space-y-0 pb-1">
            <div className="flex items-center justify-center size-12 rounded-2xl bg-primary/10 dark:bg-primary/20 mb-1">
              <CheckSquare className="size-6 text-primary" />
            </div>
            <DialogTitle className="text-xl font-semibold">New Task</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Fill in the details below to add your task.
            </p>
          </DialogHeader>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.25 }}
            className="space-y-1.5"
          >
            <Label className="text-xs text-muted-foreground font-medium">
              Task title <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              placeholder="What do you need to do?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) handleSubmit(); }}
              className="rounded-xl"
            />
          </motion.div>

          {/* Priority */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.25 }}
            className="space-y-2"
          >
            <Label className="text-xs text-muted-foreground font-medium">Priority</Label>
            <div className="flex gap-1.5">
              {PRIORITY_OPTS.map(({ value, label, emoji }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPriority(value)}
                  className={cn(
                    "flex-1 py-2 rounded-full text-sm font-medium transition-all text-center",
                    priority === value ? chipActive : chipIdle
                  )}
                  style={
                    priority === value
                      ? { backgroundColor: PRIORITY_COLORS[value], color: "#fff" }
                      : undefined
                  }
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Due date */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.25 }}
            className="space-y-2"
          >
            <Label className="text-xs text-muted-foreground font-medium">Due date</Label>
            <div className="flex gap-1.5 flex-wrap">
              {DATE_PRESETS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDatePreset(id)}
                  className={cn(
                    chipBase,
                    datePreset === id ? chipActive : chipIdle
                  )}
                >
                  {id === "none" && "✕ "}
                  {id === "today" && "📅 "}
                  {id === "tomorrow" && "⏭ "}
                  {id === "week" && "📆 "}
                  {id === "custom" && "🗓 "}
                  {label}
                </button>
              ))}
            </div>
            <AnimatePresence>
              {datePreset === "custom" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="rounded-xl mt-1"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Time (only when a date is chosen) */}
          <AnimatePresence initial={false}>
            {datePreset !== "none" && (
              <motion.div
                key="time-section"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-2 overflow-hidden"
              >
                <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  Time
                </Label>
                <div className="flex gap-1.5 flex-wrap">
                  {TIME_PRESETS.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTimePreset(id)}
                      className={cn(
                        chipBase,
                        timePreset === id ? chipActive : chipIdle
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <AnimatePresence>
                  {timePreset === "custom" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Input
                        type="time"
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        className="rounded-xl mt-1"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Course */}
          {showCourseField && courseOptions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.25 }}
              className="space-y-2"
            >
              <Label className="text-xs text-muted-foreground font-medium">Course</Label>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCourseId("")}
                  className={cn(chipBase, !courseId ? chipActive : chipIdle)}
                >
                  None
                </button>
                {courseOptions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCourseId(c.id)}
                    className={cn(chipBase, courseId === c.id ? chipActive : chipIdle)}
                    style={
                      courseId === c.id
                        ? { backgroundColor: c.color, color: "#fff" }
                        : undefined
                    }
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Notes toggle */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.25 }}
          >
            <button
              type="button"
              onClick={() => setShowNotes((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <AlignLeft className="size-3.5" />
              {showNotes ? "Hide notes" : "Add notes"}
            </button>
            <AnimatePresence>
              {showNotes && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2"
                >
                  <Textarea
                    placeholder="Additional details (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="rounded-xl resize-none"
                    autoFocus
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.25 }}
            className="flex justify-between pt-1"
          >
            <Button variant="ghost" onClick={handleClose} className="rounded-full">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="rounded-full px-6"
            >
              Add Task
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── TodoRow ─────────────────────────────────────────────────────────────────

function TodoRow({
  todo,
  courseLookup,
  showCourseField,
}: {
  todo: TodoItem;
  courseLookup: Map<string, { name: string; color: string }>;
  showCourseField: boolean;
}) {
  const updateTodo = useTodoStore((s) => s.updateTodo);
  const removeTodo = useTodoStore((s) => s.removeTodo);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDesc, setEditDesc] = useState(todo.description);
  const [editPriority, setEditPriority] = useState<TodoPriority>(todo.priority);
  const [editDue, setEditDue] = useState(
    todo.dueDate ? todo.dueDate.split("T")[0] : ""
  );
  const [editDueTime, setEditDueTime] = useState(() => {
    if (!todo.dueDate) return "";
    const d = new Date(todo.dueDate);
    if (d.getHours() === 0 && d.getMinutes() === 0) return "";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [editCourse, setEditCourse] = useState(todo.courseId ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    if (todo.status === "completed") setCelebrating(false);
  }, [todo.status]);

  const dueInfo = formatDueLabel(todo.dueDate);
  const isCanvas = todo.source === "canvas";
  const isCompleted = todo.status === "completed";
  const course = todo.courseId ? courseLookup.get(todo.courseId) : null;
  const priorityColor = PRIORITY_COLORS[todo.priority];
  const showStrike = isCompleted || celebrating;

  function toggleComplete() {
    if (isCompleted) {
      updateTodo(todo.id, { status: "pending", completedAt: null });
      return;
    }
    if (celebrating) return;
    setCelebrating(true);
    window.setTimeout(() => {
      updateTodo(todo.id, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });
    }, 550);
  }

  function saveEdit() {
    const t = editTitle.trim();
    if (!t) return;
    let nextDue: string | null = todo.dueDate;
    if (!isCanvas) {
      if (!editDue) {
        nextDue = null;
      } else {
        const d = new Date(editDue + "T00:00:00");
        if (editDueTime) {
          const [h, m] = editDueTime.split(":").map(Number);
          d.setHours(h, m, 0, 0);
        }
        nextDue = d.toISOString();
      }
    }
    updateTodo(todo.id, {
      title: isCanvas ? todo.title : t,
      description: editDesc.trim(),
      priority: editPriority,
      dueDate: nextDue,
      courseId: editCourse || null,
    });
    setEditing(false);
  }

  const courseOptions = Array.from(courseLookup.entries());

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{
        opacity: celebrating ? 0.85 : 1,
        y: 0,
        scale: celebrating ? 0.985 : 1,
      }}
      exit={{ opacity: 0, x: -8, scale: 0.97, transition: { duration: 0.25 } }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className={cn(
        "group relative rounded-xl border bg-card/80 backdrop-blur-sm transition-all overflow-hidden",
        "hover:border-border hover:shadow-sm hover:bg-card",
        isCompleted && "opacity-55"
      )}
      style={{
        boxShadow: celebrating
          ? `0 0 0 2px ${priorityColor}33, 0 4px 14px ${priorityColor}22`
          : undefined,
      }}
    >
      {/* Priority stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{
          background: `linear-gradient(180deg, ${priorityColor} 0%, ${priorityColor}99 100%)`,
        }}
      />

      {/* Celebration glow */}
      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, ${priorityColor}15 0%, transparent 80%)`,
            }}
          />
        )}
      </AnimatePresence>

      <div className="pl-4 pr-2 py-3 flex items-start gap-3 relative">
        {/* Checkbox */}
        <motion.div
          className="mt-0.5 shrink-0"
          animate={
            celebrating
              ? { scale: [1, 1.25, 1], rotate: [0, -8, 0] }
              : { scale: 1, rotate: 0 }
          }
          transition={{ duration: 0.5 }}
        >
          {isCanvas ? (
            <Tooltip>
              <TooltipTrigger render={<span />}>
                <Checkbox checked={isCompleted || celebrating} onCheckedChange={toggleComplete} />
              </TooltipTrigger>
              <TooltipContent side="top">
                Marks as done in Nexus only. Submit your work on Canvas separately.
              </TooltipContent>
            </Tooltip>
          ) : (
            <Checkbox checked={isCompleted || celebrating} onCheckedChange={toggleComplete} />
          )}
        </motion.div>

        {editing ? (
          <div className="flex-1 space-y-2.5">
            {isCanvas ? (
              <div className="space-y-1">
                <p className="font-medium text-sm">{todo.title}</p>
                <p className="text-xs text-muted-foreground">
                  Synced from Canvas — edit on Canvas to change title or due date.
                </p>
              </div>
            ) : (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-8"
                autoFocus
              />
            )}
            <Textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
            />
            <div className="flex flex-wrap items-end gap-2">
              <PriorityToggle value={editPriority} onChange={setEditPriority} />
              {!isCanvas && (
                <>
                  <Input
                    type="date"
                    value={editDue}
                    onChange={(e) => setEditDue(e.target.value)}
                    className="h-8 w-auto"
                  />
                  <Input
                    type="time"
                    value={editDueTime}
                    onChange={(e) => setEditDueTime(e.target.value)}
                    disabled={!editDue}
                    className="h-8 w-auto"
                  />
                </>
              )}
              {showCourseField && (
                <Select
                  value={editCourse || "__none__"}
                  onValueChange={(v) => setEditCourse(v === "__none__" || v == null ? "" : v)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No course</SelectItem>
                    {courseOptions.map(([id, c]) => (
                      <SelectItem key={id} value={id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={saveEdit}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-left flex-1 min-w-0 text-[0.9375rem] font-medium leading-snug relative"
              >
                <span
                  className={cn(
                    "block truncate transition-colors",
                    showStrike && "text-muted-foreground"
                  )}
                >
                  {todo.title}
                </span>
                {/* Animated strikethrough */}
                <motion.span
                  className="pointer-events-none absolute left-0 top-1/2 h-[1.5px] bg-current"
                  initial={false}
                  animate={{
                    width: showStrike ? "100%" : "0%",
                    opacity: showStrike ? 0.7 : 0,
                  }}
                  transition={{ duration: celebrating ? 0.45 : 0.25, ease: "easeOut" }}
                  style={{ originX: 0 }}
                />
              </button>
            </div>

            {/* Meta row */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              {course && (
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium"
                  style={{ color: course.color }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: course.color }}
                  />
                  {course.name}
                </span>
              )}
              {dueInfo.label && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs tabular-nums",
                    dueInfo.overdue
                      ? "text-red-600 font-medium"
                      : dueInfo.today
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {dueInfo.hasTime ? (
                    <Clock className="size-3" />
                  ) : (
                    <Calendar className="size-3" />
                  )}
                  {dueInfo.label}
                </span>
              )}
              {todo.removedFromCanvas && (
                <Badge
                  variant="outline"
                  className="text-[10px] gap-1 text-amber-600 border-amber-500/40 py-0 h-5"
                >
                  <AlertTriangle className="size-3" />
                  Removed
                </Badge>
              )}
              {isCanvas && todo.canvasUrl && (
                <a
                  href={todo.canvasUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Open in Canvas"
                  className="inline-flex"
                >
                  <CanvasBadge />
                </a>
              )}
            </div>

            {todo.description && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {todo.description}
              </p>
            )}
          </div>
        )}

        {!editing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setEditing(true)}
              aria-label="Edit task"
            >
              <Pencil className="size-3" />
            </Button>
            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
              <AlertDialogTrigger
                render={<Button variant="ghost" size="icon-xs" aria-label="Delete task" />}
              >
                <Trash2 className="size-3" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                  <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => removeTodo(todo.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

type SectionTone = "overdue" | "today" | "upcoming" | "nodate" | "completed";

const SECTION_META: Record<
  SectionTone,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  overdue:   { icon: Flame,         color: "text-red-600" },
  today:     { icon: CheckSquare,   color: "text-primary" },
  upcoming:  { icon: CalendarDays,  color: "text-blue-600 dark:text-blue-400" },
  nodate:    { icon: Inbox,         color: "text-muted-foreground" },
  completed: { icon: CheckCircle2,  color: "text-emerald-600 dark:text-emerald-400" },
};

function Section({
  title,
  count,
  tone,
  defaultOpen = true,
  children,
}: {
  title: string;
  count: number;
  tone: SectionTone;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  const meta = SECTION_META[tone];
  const Icon = meta.icon;
  return (
    <motion.div layout className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-semibold w-full group/section"
      >
        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.2 }}
          className="inline-flex"
        >
          <ChevronDown className="size-4 text-muted-foreground" />
        </motion.span>
        <Icon className={cn("size-4", meta.color)} />
        <span className={cn(meta.color)}>{title}</span>
        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
          {count}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-0.5">
              <AnimatePresence mode="popLayout" initial={false}>
                {children}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── SyncStatus ───────────────────────────────────────────────────────────────

function SyncStatus() {
  const isConnected = useCanvasStore((s) => s.isConnected);
  const lastSyncedAt = useCanvasStore((s) => s.lastSyncedAt);
  const syncNow = useCanvasStore((s) => s._syncNow);
  const [syncing, setSyncing] = useState(false);

  if (!isConnected) return null;

  async function handleSync() {
    if (!syncNow) return;
    setSyncing(true);
    try {
      await syncNow();
      toast.success("Synced from Canvas");
    } catch {
      toast.error("Canvas sync failed");
    } finally {
      setSyncing(false);
    }
  }

  const relLabel = lastSyncedAt
    ? (() => {
        const diff = Date.now() - new Date(lastSyncedAt).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins} min ago`;
        const hrs = Math.floor(mins / 60);
        return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
      })()
    : null;

  return (
    <div className="flex items-center gap-2">
      {syncing ? (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <RefreshCw className="size-3 animate-spin" /> Syncing...
        </span>
      ) : (
        relLabel && (
          <span className="text-xs text-muted-foreground">Last synced: {relLabel}</span>
        )
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={syncing || !syncNow}
        className="gap-1.5"
      >
        <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
        Sync from Canvas
      </Button>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function TodosView() {
  const mounted = useMounted();
  const items = useTodoStore((s) => s.items);
  const filters = useTodoStore((s) => s.filters);
  const setFilters = useTodoStore((s) => s.setFilters);
  const clearCompleted = useTodoStore((s) => s.clearCompleted);

  const gradesEnabled = useModuleStore((s) => s.enabledModules["grades"] ?? false);
  const canvasConnected = useCanvasStore((s) => s.isConnected);
  const gradeCourses = useGradeStore((s) => s.courses);
  const canvasCourses = useCanvasStore((s) => s.courses);

  const [modalOpen, setModalOpen] = useState(false);

  const courseLookup = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    if (gradesEnabled) {
      for (const c of gradeCourses) {
        map.set(c.id, { name: c.name, color: c.color });
      }
    }
    for (const c of canvasCourses) {
      map.set(`canvas:${c.id}`, { name: c.course_code || c.name, color: "#6366f1" });
    }
    return map;
  }, [gradesEnabled, gradeCourses, canvasCourses]);

  const manualCourseOptions = gradesEnabled
    ? gradeCourses.map((c) => ({ id: c.id, name: c.name, color: c.color }))
    : [];

  const filtered = useMemo(() => {
    return items.filter((t) => {
      if (filters.priority !== "all" && t.priority !== filters.priority) return false;
      if (filters.source !== "all" && t.source !== filters.source) return false;
      if (filters.status === "active" && t.status === "completed") return false;
      if (filters.status === "completed" && t.status !== "completed") return false;
      if (filters.courseId !== "all") {
        const key =
          t.source === "canvas" && t.canvasCourseId != null
            ? `canvas:${t.canvasCourseId}`
            : t.courseId;
        if (key !== filters.courseId) return false;
      }
      return true;
    });
  }, [items, filters]);

  const sorted = useMemo(() => {
    const po = { urgent: 0, high: 1, medium: 2, low: 3 };
    return [...filtered].sort((a, b) => {
      if (filters.sortBy === "priority") {
        return (po[a.priority] ?? 4) - (po[b.priority] ?? 4);
      }
      if (filters.sortBy === "createdAt") return b.createdAt.localeCompare(a.createdAt);
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }, [filtered, filters.sortBy]);

  const groups = useMemo(() => {
    const today = getTodayStart();
    const overdue: TodoItem[] = [];
    const todayItems: TodoItem[] = [];
    const upcoming: TodoItem[] = [];
    const noDate: TodoItem[] = [];
    const completed: TodoItem[] = [];

    for (const t of sorted) {
      if (t.status === "completed") { completed.push(t); continue; }
      if (!t.dueDate) { noDate.push(t); continue; }
      const d = new Date(t.dueDate);
      d.setHours(0, 0, 0, 0);
      if (d < today) overdue.push(t);
      else if (d.getTime() === today.getTime()) todayItems.push(t);
      else upcoming.push(t);
    }
    completed.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
    return { overdue, today: todayItems, upcoming, noDate, completed };
  }, [sorted]);

  const courseFilterOptions = useMemo(
    () => Array.from(courseLookup.entries()).map(([id, c]) => ({ id, name: c.name })),
    [courseLookup]
  );

  const totalCount = items.length;

  const SORT_LABELS: Record<string, string> = {
    dueDate: "Due date",
    priority: "Priority",
    createdAt: "Date created",
  };

  const hasActiveFilters =
    filters.priority !== "all" ||
    filters.courseId !== "all" ||
    filters.source !== "all" ||
    filters.status !== "active" ||
    filters.sortBy !== "dueDate";

  if (!mounted) return <div className="h-[60vh]" />;

  return (
    <ModuleGuard moduleId="todos">
      <div className="space-y-4 pb-12">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">To-Do List</h1>
          <div className="flex items-center gap-2">
            <SyncStatus />
            <Button onClick={() => setModalOpen(true)} className="gap-1.5 rounded-full px-4">
              <Plus className="size-4" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Filter / sort bar */}
        {totalCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Select
              value={filters.status}
              onValueChange={(v) => setFilters({ status: v as typeof filters.status })}
            >
              <SelectTrigger size="sm" className="capitalize"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="all">All tasks</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.priority}
              onValueChange={(v) => setFilters({ priority: v as typeof filters.priority })}
            >
              <SelectTrigger size="sm" className="capitalize"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            {courseFilterOptions.length > 0 && (
              <Select
                value={filters.courseId}
                onValueChange={(v) => setFilters({ courseId: v ?? "all" })}
              >
                <SelectTrigger size="sm">
                  <SelectValue>
                    {filters.courseId === "all"
                      ? "All courses"
                      : (courseFilterOptions.find((c) => c.id === filters.courseId)?.name ?? "Course")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All courses</SelectItem>
                  {courseFilterOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {canvasConnected && (
              <Select
                value={filters.source}
                onValueChange={(v) => setFilters({ source: v as typeof filters.source })}
              >
                <SelectTrigger size="sm" className="capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="canvas">Canvas</SelectItem>
                </SelectContent>
              </Select>
            )}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sort by</span>
              <Select
                value={filters.sortBy}
                onValueChange={(v) => setFilters({ sortBy: v as typeof filters.sortBy })}
              >
                <SelectTrigger size="sm">
                  <SelectValue>
                    {SORT_LABELS[filters.sortBy]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dueDate">Due date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="createdAt">Date created</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Clear filters"
                  onClick={() => useTodoStore.getState().resetFilters()}
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {totalCount === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
            <CheckSquare className="size-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No tasks yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Add your first task to get started.
            </p>
            <Button onClick={() => setModalOpen(true)} className="gap-1.5 rounded-full">
              <Plus className="size-4" />
              Add your first task
            </Button>
            {canvasConnected && (
              <p className="text-sm text-muted-foreground mt-3">
                Or <strong>Sync from Canvas</strong> to import your assignments.
              </p>
            )}
          </div>
        )}

        {/* Task sections */}
        {totalCount > 0 && (
          <LayoutGroup>
            <div className="space-y-5">
            <Section title="Overdue" count={groups.overdue.length} tone="overdue">
              {groups.overdue.map((t) => (
                <TodoRow key={t.id} todo={t} courseLookup={courseLookup} showCourseField={gradesEnabled} />
              ))}
            </Section>
            <Section title="Today" count={groups.today.length} tone="today">
              {groups.today.map((t) => (
                <TodoRow key={t.id} todo={t} courseLookup={courseLookup} showCourseField={gradesEnabled} />
              ))}
            </Section>
            <Section title="Upcoming" count={groups.upcoming.length} tone="upcoming">
              {groups.upcoming.map((t) => (
                <TodoRow key={t.id} todo={t} courseLookup={courseLookup} showCourseField={gradesEnabled} />
              ))}
            </Section>
            <Section title="No Date" count={groups.noDate.length} tone="nodate">
              {groups.noDate.map((t) => (
                <TodoRow key={t.id} todo={t} courseLookup={courseLookup} showCourseField={gradesEnabled} />
              ))}
            </Section>
            <Section title="Completed" count={groups.completed.length} tone="completed" defaultOpen={false}>
              {groups.completed.map((t) => (
                <TodoRow key={t.id} todo={t} courseLookup={courseLookup} showCourseField={gradesEnabled} />
              ))}
              {groups.completed.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground gap-1.5 mt-2"
                      />
                    }
                  >
                    <Trash2 className="size-3.5" />
                    Clear completed
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Clear {groups.completed.length} completed tasks?
                      </AlertDialogTitle>
                      <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={clearCompleted}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Clear
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </Section>
            </div>
          </LayoutGroup>
        )}

        {/* Add Task Modal */}
        <AddTaskModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          showCourseField={gradesEnabled && manualCourseOptions.length > 0}
          courseOptions={manualCourseOptions}
        />
      </div>
    </ModuleGuard>
  );
}
