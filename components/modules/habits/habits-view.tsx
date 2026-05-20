"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Sparkles,
  Flame,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ModuleGuard } from "@/components/modules/module-guard";
import { useMounted } from "@/hooks/use-hydration";
import { useHabitStore } from "@/stores/useHabitStore";
import { cn } from "@/lib/utils";
import type { Habit, HabitFrequency } from "@/types";
import {
  HABIT_COLOR_PALETTE,
  HABIT_EMOJIS,
  currentStreak,
  frequencyLabel,
  getTodayString,
  isHabitScheduledOn,
  longestStreak,
  parseDateString,
  toDateString,
} from "./habit-utils";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

// ─── Habit Card ────────────────────────────────────────────────────────────

function HabitCard({
  habit,
  onEdit,
  onDelete,
  scheduledToday,
  reduced,
}: {
  habit: Habit;
  onEdit: () => void;
  onDelete: () => void;
  scheduledToday: boolean;
  reduced?: boolean;
}) {
  const toggleCompletion = useHabitStore((s) => s.toggleCompletion);
  const today = getTodayString();
  const done = habit.completions.includes(today);
  const [expanded, setExpanded] = useState(false);
  const [popping, setPopping] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : reduced ? 0.55 : 1,
  };

  function handleToggle() {
    if (!done) {
      setPopping(true);
      window.setTimeout(() => setPopping(false), 400);
    }
    toggleCompletion(habit.id, today);
  }

  const streak = currentStreak(habit);
  const freqText = frequencyLabel(habit);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-xl border bg-card/80 backdrop-blur-sm transition-colors",
        "hover:border-border hover:bg-card",
        isDragging && "shadow-lg"
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          className="touch-none flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-3 min-w-0 text-left"
        >
          <span
            className="flex size-10 items-center justify-center rounded-full text-lg shrink-0"
            style={{
              backgroundColor: `${habit.color}22`,
              color: habit.color,
            }}
          >
            {habit.icon || "✨"}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-medium text-sm truncate">
              {habit.name}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>{freqText}</span>
              {streak > 0 && (
                <span className="inline-flex items-center gap-0.5 font-medium text-amber-600 dark:text-amber-400">
                  <Flame className="size-3" /> {streak} day{streak === 1 ? "" : "s"}
                </span>
              )}
            </span>
          </span>
        </button>

        <motion.div
          animate={
            popping
              ? { scale: [1, 1.35, 1], rotate: [0, -8, 0] }
              : { scale: 1, rotate: 0 }
          }
          transition={{ duration: 0.4 }}
          className="shrink-0"
        >
          <button
            type="button"
            onClick={handleToggle}
            className={cn(
              "flex size-9 items-center justify-center rounded-full border-2 transition-all",
              done
                ? "text-white shadow-sm"
                : "border-input bg-background text-transparent hover:border-ring"
            )}
            style={
              done
                ? {
                    backgroundColor: habit.color,
                    borderColor: habit.color,
                  }
                : undefined
            }
            aria-label={done ? "Mark incomplete" : "Mark complete"}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </motion.div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Habit options"
                className="shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
              />
            }
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="size-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t px-4 py-4">
              <HabitHeatmap habit={habit} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Heatmap ─────────────────────────────────────────────────────────────

function HabitHeatmap({ habit }: { habit: Habit }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateString(today);

  // Build a 7 x 16 grid: columns = weeks (left = oldest), rows = day-of-week (0..6, Sun..Sat).
  // Find the most recent Saturday on/after today to anchor the rightmost column's bottom row.
  // To make today appear in the rightmost column, we anchor the rightmost column to
  // the week containing today (Sun..Sat).
  const completions = new Set(habit.completions);
  const todayDow = today.getDay();
  const rightColEnd = new Date(today);
  rightColEnd.setDate(today.getDate() + (6 - todayDow)); // Saturday of this week
  // The leftmost column = 15 weeks before
  const leftColStart = new Date(rightColEnd);
  leftColStart.setDate(rightColEnd.getDate() - (16 * 7 - 1));

  const cells: { date: Date; ds: string }[][] = [];
  for (let col = 0; col < 16; col++) {
    const colCells: { date: Date; ds: string }[] = [];
    for (let row = 0; row < 7; row++) {
      const d = new Date(leftColStart);
      d.setDate(leftColStart.getDate() + col * 7 + row);
      d.setHours(0, 0, 0, 0);
      colCells.push({ date: d, ds: toDateString(d) });
    }
    cells.push(colCells);
  }

  const cur = currentStreak(habit);
  const longest = longestStreak(habit);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto">
        {cells.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map(({ date, ds }) => {
              const isFuture = date.getTime() > today.getTime();
              const completed = completions.has(ds);
              const scheduled = isHabitScheduledOn(habit, date);
              const isToday = ds === todayStr;

              let bg = "var(--muted)";
              let opacity = 1;
              if (isFuture) {
                opacity = 0.2;
              } else if (completed) {
                bg = habit.color;
              } else if (!scheduled) {
                opacity = 0.25;
              } else {
                opacity = 0.55;
              }

              const label = isFuture
                ? `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} — Upcoming`
                : !scheduled
                ? `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} — Not scheduled`
                : completed
                ? `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} — Completed`
                : `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} — Missed`;

              return (
                <Tooltip key={ds}>
                  <TooltipTrigger
                    render={
                      <div
                        className={cn(
                          "size-3 rounded-[3px]",
                          isToday && "ring-1 ring-foreground/60"
                        )}
                      />
                    }
                    style={{
                      backgroundColor: bg,
                      opacity,
                    }}
                  />
                  <TooltipContent side="top">{label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-6 text-xs">
        <div>
          <p className="text-muted-foreground">Current streak</p>
          <p className="text-sm font-semibold">
            {cur} day{cur === 1 ? "" : "s"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Longest streak</p>
          <p className="text-sm font-semibold">
            {longest} day{longest === 1 ? "" : "s"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Total completions</p>
          <p className="text-sm font-semibold">{habit.completions.length}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Add/Edit Modal ──────────────────────────────────────────────────────

function HabitFormModal({
  open,
  onOpenChange,
  habit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  habit?: Habit | null;
}) {
  const addHabit = useHabitStore((s) => s.addHabit);
  const updateHabit = useHabitStore((s) => s.updateHabit);
  const habits = useHabitStore((s) => s.habits);

  const isEdit = !!habit;
  const [name, setName] = useState(habit?.name ?? "");
  const [icon, setIcon] = useState(habit?.icon ?? "📚");
  const [color, setColor] = useState(habit?.color ?? HABIT_COLOR_PALETTE[0]);
  const [frequency, setFrequency] = useState<HabitFrequency>(
    habit?.frequency ?? "daily"
  );
  const [customDays, setCustomDays] = useState<number[]>(
    habit?.customDays ?? [1, 3, 5]
  );

  // Reset when modal opens
  useResetForm(open, habit, {
    setName,
    setIcon,
    setColor,
    setFrequency,
    setCustomDays,
  });

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (isEdit && habit) {
      updateHabit(habit.id, {
        name: trimmed,
        icon: icon || undefined,
        color,
        frequency,
        customDays: frequency === "custom" ? customDays : undefined,
      });
      toast.success("Habit updated");
    } else {
      addHabit({
        id: crypto.randomUUID(),
        name: trimmed,
        icon: icon || undefined,
        color,
        frequency,
        customDays: frequency === "custom" ? customDays : undefined,
        completions: [],
        createdAt: new Date().toISOString(),
        order: habits.length,
      });
      toast.success("Habit created");
    }
    handleClose();
  }

  function toggleDay(d: number) {
    setCustomDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl">
        <div className="bg-card px-6 py-6 space-y-5">
          <DialogHeader className="text-center items-center gap-2 space-y-0">
            <div
              className="flex items-center justify-center size-12 rounded-2xl mb-1"
              style={{ backgroundColor: `${color}22`, color }}
            >
              <span className="text-2xl">{icon || "✨"}</span>
            </div>
            <DialogTitle className="text-xl font-semibold">
              {isEdit ? "Edit habit" : "New habit"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              placeholder="Read for 30 minutes"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) handleSubmit();
              }}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Icon</Label>
            <div className="grid grid-cols-10 gap-1.5 max-h-32 overflow-y-auto p-1 rounded-xl border bg-muted/30">
              {HABIT_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(e)}
                  className={cn(
                    "flex items-center justify-center aspect-square rounded-md text-lg hover:bg-muted transition-colors",
                    icon === e && "bg-primary/15 ring-2 ring-primary"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
            <Input
              placeholder="Or type any emoji"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="rounded-xl"
              maxLength={4}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Color</Label>
            <div className="flex flex-wrap gap-2">
              {HABIT_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-7 rounded-full border-2 transition-transform",
                    color === c
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Frequency</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["daily", "weekdays", "custom"] as HabitFrequency[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className={cn(
                    "px-3 py-2 rounded-full text-sm font-medium capitalize transition-colors",
                    frequency === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 dark:bg-muted/30 hover:bg-muted"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <AnimatePresence initial={false}>
              {frequency === "custom" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex justify-between gap-1.5 pt-2">
                    {DAY_LETTERS.map((letter, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleDay(i)}
                        className={cn(
                          "flex-1 h-9 rounded-lg text-sm font-medium transition-colors",
                          customDays.includes(i)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/60 dark:bg-muted/30 hover:bg-muted"
                        )}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex justify-between pt-1">
            <Button variant="ghost" onClick={handleClose} className="rounded-full">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || (frequency === "custom" && customDays.length === 0)}
              className="rounded-full px-6"
            >
              {isEdit ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function useResetForm(
  open: boolean,
  habit: Habit | null | undefined,
  setters: {
    setName: (v: string) => void;
    setIcon: (v: string) => void;
    setColor: (v: string) => void;
    setFrequency: (v: HabitFrequency) => void;
    setCustomDays: (v: number[]) => void;
  }
) {
  useEffect(() => {
    if (!open) return;
    setters.setName(habit?.name ?? "");
    setters.setIcon(habit?.icon ?? "📚");
    setters.setColor(habit?.color ?? HABIT_COLOR_PALETTE[0]);
    setters.setFrequency(habit?.frequency ?? "daily");
    setters.setCustomDays(habit?.customDays ?? [1, 3, 5]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, habit?.id]);
}

// ─── Main view ───────────────────────────────────────────────────────────

export function HabitsView() {
  const mounted = useMounted();
  const habits = useHabitStore((s) => s.habits);
  const removeHabit = useHabitStore((s) => s.removeHabit);
  const reorderHabits = useHabitStore((s) => s.reorderHabits);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Habit | null>(null);
  const [showNotScheduled, setShowNotScheduled] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const today = useMemo(() => new Date(), []);

  const sorted = useMemo(
    () => [...habits].sort((a, b) => a.order - b.order),
    [habits]
  );

  const { scheduled, notScheduled } = useMemo(() => {
    const sch: Habit[] = [];
    const not: Habit[] = [];
    for (const h of sorted) {
      if (isHabitScheduledOn(h, today)) sch.push(h);
      else not.push(h);
    }
    return { scheduled: sch, notScheduled: not };
  }, [sorted, today]);

  const todayStr = toDateString(today);
  const completedToday = scheduled.filter((h) =>
    h.completions.includes(todayStr)
  ).length;
  const totalScheduled = scheduled.length;
  const progress =
    totalScheduled === 0 ? 0 : (completedToday / totalScheduled) * 100;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = sorted.map((h) => h.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(ids, oldIndex, newIndex);
    reorderHabits(next);
  }

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(h: Habit) {
    setEditing(h);
    setModalOpen(true);
  }

  if (!mounted) return <div className="h-[60vh]" />;

  return (
    <ModuleGuard moduleId="habits">
      <div className="space-y-6 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Habits</h1>
          {habits.length > 0 && (
            <Button onClick={openNew} className="gap-1.5 rounded-full px-4">
              <Plus className="size-4" />
              Add Habit
            </Button>
          )}
        </div>

        {habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
            <Sparkles className="size-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              No habits yet
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Start building your routine
            </p>
            <Button onClick={openNew} className="gap-1.5 rounded-full">
              <Plus className="size-4" />
              Add Habit
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-semibold">
                  {completedToday}
                </span>{" "}
                of {totalScheduled} habit{totalScheduled === 1 ? "" : "s"} done today
              </p>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={scheduled.map((h) => h.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {scheduled.map((h) => (
                      <motion.div
                        key={h.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <HabitCard
                          habit={h}
                          scheduledToday
                          onEdit={() => openEdit(h)}
                          onDelete={() => setConfirmDelete(h)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </SortableContext>

              {notScheduled.length > 0 && (
                <div className="mt-6 space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowNotScheduled((v) => !v)}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <motion.span
                      animate={{ rotate: showNotScheduled ? 0 : -90 }}
                      transition={{ duration: 0.2 }}
                      className="inline-flex"
                    >
                      <ChevronDown className="size-4" />
                    </motion.span>
                    Not scheduled today
                    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-muted text-[11px]">
                      {notScheduled.length}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {showNotScheduled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <SortableContext
                          items={notScheduled.map((h) => h.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2 pt-1">
                            {notScheduled.map((h) => (
                              <HabitCard
                                key={h.id}
                                habit={h}
                                scheduledToday={false}
                                reduced
                                onEdit={() => openEdit(h)}
                                onDelete={() => setConfirmDelete(h)}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </DndContext>
          </>
        )}

        <HabitFormModal
          open={modalOpen}
          onOpenChange={(v) => {
            setModalOpen(v);
            if (!v) setEditing(null);
          }}
          habit={editing}
        />

        <AlertDialog
          open={!!confirmDelete}
          onOpenChange={(v) => {
            if (!v) setConfirmDelete(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete &lsquo;{confirmDelete?.name}&rsquo;?
              </AlertDialogTitle>
              <AlertDialogDescription>
                All completion history will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmDelete) {
                    removeHabit(confirmDelete.id);
                    toast.success("Habit deleted");
                  }
                  setConfirmDelete(null);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ModuleGuard>
  );
}
