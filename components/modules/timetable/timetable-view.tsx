"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Upload,
  Download,
  Printer,
  Trash2,
  Pencil,
  X,
  AlignLeft,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { ModuleGuard } from "@/components/modules/module-guard";
import { useMounted } from "@/hooks/use-hydration";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useTimetableStore } from "@/stores/useTimetableStore";
import { cn } from "@/lib/utils";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  addDays,
  exportIcs,
  fromMinutes,
  getWeekStart,
  overlaps,
  parseIcs,
  snapToSlot,
  toMinutes,
} from "@/lib/ics";
import type {
  DayOfWeek,
  TimetableCategory,
  TimetableEntry,
} from "@/types";

// ─── Grid constants ───────────────────────────────────────────────────────

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_ORDER: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0]; // Mon → Sun
const START_HOUR = 6;
const END_HOUR = 23;
const SLOT_MIN = 30;
const SLOT_PX = 28; // height per 30-min slot
const SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_MIN + 1; // 6:00 through 23:00

function slotToMinutes(slotIdx: number): number {
  return START_HOUR * 60 + slotIdx * SLOT_MIN;
}

function minutesToOffsetPx(mins: number): number {
  return ((mins - START_HOUR * 60) / SLOT_MIN) * SLOT_PX;
}

function formatHeaderDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatTimeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function isSameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ─── Event modal ──────────────────────────────────────────────────────────

interface EventDraft {
  id?: string;
  title: string;
  category: TimetableCategory;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  color: string;
  notes: string;
}

const PRESET_COLORS = [
  "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#6b7280",
  "#ef4444", "#f97316", "#14b8a6", "#ec4899", "#0ea5e9",
];

interface EventModalProps {
  open: boolean;
  mode: "create" | "edit";
  initial: EventDraft;
  onClose: () => void;
  onSave: (draft: EventDraft) => void;
  onDelete?: () => void;
  entries: TimetableEntry[];
}

function EventModal({
  open,
  mode,
  initial,
  onClose,
  onSave,
  onDelete,
  entries,
}: EventModalProps) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(initial);
      setError(null);
    }
  }, [open, initial]);

  function updateField<K extends keyof EventDraft>(k: K, v: EventDraft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function setCategory(cat: TimetableCategory) {
    setDraft((d) => ({
      ...d,
      category: cat,
      // only update color if it's still the previous category default
      color:
        d.color === CATEGORY_COLORS[d.category]
          ? CATEGORY_COLORS[cat]
          : d.color,
    }));
  }

  function handleSave() {
    const title = draft.title.trim();
    if (!title) {
      setError("Title is required");
      return;
    }
    if (toMinutes(draft.endTime) <= toMinutes(draft.startTime)) {
      setError("End time must be after start time");
      return;
    }
    const conflict = entries.find((e) =>
      overlaps({ ...draft, id: draft.id }, e)
    );
    if (conflict) {
      setError(`Overlaps with "${conflict.title}"`);
      return;
    }
    onSave({ ...draft, title });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl border-0 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="bg-card px-6 py-7 space-y-5">
          <DialogHeader className="text-center items-center gap-2 space-y-0 pb-1">
            <div className="flex items-center justify-center size-12 rounded-2xl bg-primary/10 dark:bg-primary/20 mb-1">
              <CalendarDays className="size-6 text-primary" />
            </div>
            <DialogTitle className="text-xl font-semibold">
              {mode === "create" ? "New Event" : "Edit Event"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {mode === "create"
                ? "Add a new block to your weekly schedule."
                : "Update the details below."}
            </p>
          </DialogHeader>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              value={draft.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="e.g. CS 101 Lecture"
              className="rounded-xl"
            />
          </div>

          {/* Day + Time */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5 col-span-3">
              <Label className="text-xs text-muted-foreground font-medium">Day</Label>
              <div className="flex gap-1 flex-wrap">
                {DAYS_ORDER.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => updateField("day", d)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      draft.day === d
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/60 dark:bg-muted/30 hover:bg-muted"
                    )}
                  >
                    {DAY_NAMES[d]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Start</Label>
              <Input
                type="time"
                step={60 * 30}
                value={draft.startTime}
                onChange={(e) => updateField("startTime", e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">End</Label>
              <Input
                type="time"
                step={60 * 30}
                value={draft.endTime}
                onChange={(e) => updateField("endTime", e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-medium">Category</Label>
            <div className="flex gap-1.5 flex-wrap">
              {(Object.keys(CATEGORY_LABELS) as TimetableCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    draft.category === cat
                      ? "text-white shadow-sm"
                      : "bg-muted/60 dark:bg-muted/30 hover:bg-muted"
                  )}
                  style={
                    draft.category === cat
                      ? { backgroundColor: CATEGORY_COLORS[cat] }
                      : undefined
                  }
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-medium">Color</Label>
            <div className="flex gap-1.5 flex-wrap items-center">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateField("color", c)}
                  aria-label={`Color ${c}`}
                  className={cn(
                    "size-7 rounded-full transition-transform",
                    draft.color === c && "ring-2 ring-offset-2 ring-offset-card scale-110"
                  )}
                  style={{
                    backgroundColor: c,
                    boxShadow: draft.color === c ? `0 0 0 2px ${c}` : undefined,
                  }}
                />
              ))}
              <label className="size-7 rounded-full overflow-hidden cursor-pointer border border-input relative">
                <input
                  type="color"
                  value={draft.color}
                  onChange={(e) => updateField("color", e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                  className="size-full"
                  style={{
                    background:
                      "conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)",
                  }}
                />
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <AlignLeft className="size-3.5" />
              Notes
            </Label>
            <Textarea
              value={draft.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Optional details"
              rows={2}
              className="rounded-xl resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive font-medium">{error}</p>
          )}

          {/* Footer */}
          <div className="flex justify-between items-center pt-1">
            {mode === "edit" && onDelete ? (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button variant="ghost" className="rounded-full text-destructive hover:text-destructive" />
                  }
                >
                  <Trash2 className="size-4" />
                  Delete
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure? This can&apos;t be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button variant="ghost" onClick={onClose} className="rounded-full">
                Cancel
              </Button>
            )}
            <div className="flex gap-2">
              {mode === "edit" && (
                <Button variant="ghost" onClick={onClose} className="rounded-full">
                  Cancel
                </Button>
              )}
              <Button onClick={handleSave} disabled={!draft.title.trim()} className="rounded-full px-6">
                {mode === "create" ? "Add Event" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Event block ──────────────────────────────────────────────────────────

interface EventBlockProps {
  entry: TimetableEntry;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  dragging: boolean;
  widthPct: number;
  leftPct: number;
}

function EventBlock({
  entry,
  onClick,
  onDragStart,
  onDragEnd,
  dragging,
  widthPct,
  leftPct,
}: EventBlockProps) {
  const top = minutesToOffsetPx(toMinutes(entry.startTime));
  const height = Math.max(
    SLOT_PX - 2,
    minutesToOffsetPx(toMinutes(entry.endTime)) - top
  );
  const color = entry.color || CATEGORY_COLORS[entry.category];

  return (
    <motion.button
      layout
      type="button"
      draggable
      // motion.button's onDrag* types are framer PanHandlers; HTML5 drag is
      // still forwarded to the DOM at runtime when no `drag` prop is set.
      {...({ onDragStart, onDragEnd } as Record<string, unknown>)}
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{
        opacity: dragging ? 0.4 : 1,
        scale: 1,
      }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className={cn(
        "absolute rounded-lg text-left px-2 py-1 overflow-hidden cursor-grab active:cursor-grabbing",
        "hover:shadow-md hover:scale-[1.01] transition-transform focus:outline-none focus:ring-2 focus:ring-offset-1",
      )}
      style={{
        top,
        height,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
        backgroundColor: `${color}1f`,
        borderLeft: `3px solid ${color}`,
        color,
      }}
    >
      <div className="text-[11px] font-semibold truncate leading-tight">
        {entry.title}
      </div>
      {height > SLOT_PX * 1.3 && (
        <div className="text-[10px] opacity-80 tabular-nums truncate">
          {formatTimeLabel(entry.startTime)} – {formatTimeLabel(entry.endTime)}
        </div>
      )}
    </motion.button>
  );
}

// ─── Day column ───────────────────────────────────────────────────────────

interface DayColumnProps {
  day: DayOfWeek;
  date: Date;
  isToday: boolean;
  entries: TimetableEntry[];
  onSlotClick: (day: DayOfWeek, startMin: number) => void;
  onEventClick: (entry: TimetableEntry) => void;
  onDrop: (day: DayOfWeek, slotIdx: number) => void;
  dragState: DragState | null;
  setDragState: (s: DragState | null) => void;
  invalidTarget: boolean;
}

interface DragState {
  entryId: string;
  pointerOffsetSlots: number; // slots from top of event to grab point
  hoverDay: DayOfWeek | null;
  hoverSlot: number | null;
  invalid: boolean;
}

function DayColumn({
  day,
  isToday,
  entries,
  onSlotClick,
  onEventClick,
  onDrop,
  dragState,
  setDragState,
}: DayColumnProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Layout: allow overlapping side-by-side
  const layouts = useMemo(() => computeColumnLayout(entries), [entries]);

  function handleDragOver(e: React.DragEvent) {
    if (!dragState) return;
    e.preventDefault();
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top;
    const slotIdx = Math.max(
      0,
      Math.min(SLOTS - 1, Math.floor(y / SLOT_PX) - dragState.pointerOffsetSlots)
    );
    // Check invalid (overlap with other events on this day)
    const dragged = entries.find((en) => en.id === dragState.entryId);
    const entry = useTimetableStore.getState().entries.find((en) => en.id === dragState.entryId);
    if (!entry) return;
    const duration = toMinutes(entry.endTime) - toMinutes(entry.startTime);
    const newStart = slotToMinutes(slotIdx);
    const newEnd = newStart + duration;
    const all = useTimetableStore.getState().entries;
    const invalid =
      newEnd > END_HOUR * 60 + 60 ||
      all.some(
        (en) =>
          en.id !== entry.id &&
          en.day === day &&
          toMinutes(en.startTime) < newEnd &&
          newStart < toMinutes(en.endTime)
      );
    setDragState({
      ...dragState,
      hoverDay: day,
      hoverSlot: slotIdx,
      invalid,
    });
    // suppress unused var warning
    void dragged;
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!dragState || dragState.hoverSlot == null || dragState.invalid) {
      setDragState(null);
      return;
    }
    onDrop(day, dragState.hoverSlot);
    setDragState(null);
  }

  function handleSlotClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("[data-event-block]")) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top;
    const slotIdx = Math.max(0, Math.min(SLOTS - 2, Math.floor(y / SLOT_PX)));
    onSlotClick(day, slotToMinutes(slotIdx));
  }

  const highlight =
    dragState?.hoverDay === day && dragState.hoverSlot != null;

  return (
    <div
      ref={ref}
      onDragOver={handleDragOver}
      onDragLeave={() =>
        dragState && setDragState({ ...dragState, hoverDay: null, hoverSlot: null })
      }
      onDrop={handleDrop}
      onClick={handleSlotClick}
      className={cn(
        "relative border-l border-border/60 cursor-pointer",
        isToday && "bg-primary/[0.04]"
      )}
      style={{ height: SLOTS * SLOT_PX }}
    >
      {/* Slot grid lines */}
      {Array.from({ length: SLOTS }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "absolute left-0 right-0",
            i % 2 === 0
              ? "border-t border-border/60"
              : "border-t border-border/25"
          )}
          style={{ top: i * SLOT_PX, height: 0 }}
        />
      ))}

      {/* Drag preview */}
      {highlight && dragState && (
        <div
          className={cn(
            "absolute left-0.5 right-0.5 rounded-md pointer-events-none",
            dragState.invalid
              ? "bg-red-500/15 border border-red-500/60"
              : "bg-primary/15 border border-primary/60"
          )}
          style={{
            top: (dragState.hoverSlot ?? 0) * SLOT_PX,
            height:
              (() => {
                const ent = useTimetableStore
                  .getState()
                  .entries.find((en) => en.id === dragState.entryId);
                if (!ent) return SLOT_PX;
                const dur = toMinutes(ent.endTime) - toMinutes(ent.startTime);
                return (dur / SLOT_MIN) * SLOT_PX;
              })(),
          }}
        />
      )}

      {/* Events */}
      <AnimatePresence initial={false}>
        {entries.map((entry) => {
          const layout = layouts.get(entry.id);
          const lanes = layout?.totalLanes ?? 1;
          const lane = layout?.lane ?? 0;
          const widthPct = 100 / lanes;
          const leftPct = lane * widthPct;
          return (
            <div data-event-block key={entry.id}>
              <EventBlock
                entry={entry}
                dragging={dragState?.entryId === entry.id}
                widthPct={widthPct}
                leftPct={leftPct}
                onClick={() => onEventClick(entry)}
                onDragStart={(e) => {
                  e.stopPropagation();
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const offsetPx = e.clientY - rect.top;
                  const slots = Math.max(0, Math.round(offsetPx / SLOT_PX));
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", entry.id);
                  setDragState({
                    entryId: entry.id,
                    pointerOffsetSlots: slots,
                    hoverDay: null,
                    hoverSlot: null,
                    invalid: false,
                  });
                }}
                onDragEnd={() => setDragState(null)}
              />
            </div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ─── Layout helper (side-by-side overlap) ────────────────────────────────

function computeColumnLayout(
  entries: TimetableEntry[]
): Map<string, { lane: number; totalLanes: number }> {
  const result = new Map<string, { lane: number; totalLanes: number }>();
  const sorted = [...entries].sort(
    (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)
  );
  // Simple interval graph coloring
  const laneEnds: number[] = [];
  const assigned: { id: string; lane: number; start: number; end: number }[] = [];

  for (const e of sorted) {
    const s = toMinutes(e.startTime);
    const en = toMinutes(e.endTime);
    let lane = laneEnds.findIndex((end) => end <= s);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(en);
    } else {
      laneEnds[lane] = en;
    }
    assigned.push({ id: e.id, lane, start: s, end: en });
  }

  // For each event, total lanes = max lanes used by any overlapping event cluster
  for (const a of assigned) {
    let total = 1;
    for (const b of assigned) {
      if (a.start < b.end && b.start < a.end) {
        total = Math.max(total, b.lane + 1);
      }
    }
    result.set(a.id, { lane: a.lane, totalLanes: total });
  }
  return result;
}

// ─── Main view ────────────────────────────────────────────────────────────

export function TimetableView() {
  const mounted = useMounted();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const entries = useTimetableStore((s) => s.entries);
  const addEntry = useTimetableStore((s) => s.addEntry);
  const updateEntry = useTimetableStore((s) => s.updateEntry);
  const removeEntry = useTimetableStore((s) => s.removeEntry);
  const setEntries = useTimetableStore((s) => s.setEntries);

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [mobileDayIdx, setMobileDayIdx] = useState(() => {
    const today = new Date().getDay();
    const idx = DAYS_ORDER.indexOf(today as DayOfWeek);
    return idx === -1 ? 0 : idx;
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalDraft, setModalDraft] = useState<EventDraft>(makeEmptyDraft());
  const [dragState, setDragState] = useState<DragState | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const today = new Date();

  const entriesByDay = useMemo(() => {
    const m = new Map<DayOfWeek, TimetableEntry[]>();
    for (const d of [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]) m.set(d, []);
    for (const e of entries) m.get(e.day)?.push(e);
    return m;
  }, [entries]);

  function openCreate(day: DayOfWeek, startMin: number) {
    const snapped = snapToSlot(startMin, SLOT_MIN);
    const start = fromMinutes(snapped);
    const end = fromMinutes(snapped + 60);
    setModalMode("create");
    setModalDraft({
      title: "",
      category: "class",
      day,
      startTime: start,
      endTime: end,
      color: CATEGORY_COLORS.class,
      notes: "",
    });
    setModalOpen(true);
  }

  function openEdit(entry: TimetableEntry) {
    setModalMode("edit");
    setModalDraft({
      id: entry.id,
      title: entry.title,
      category: entry.category,
      day: entry.day,
      startTime: entry.startTime,
      endTime: entry.endTime,
      color: entry.color || CATEGORY_COLORS[entry.category],
      notes: entry.notes ?? "",
    });
    setModalOpen(true);
  }

  function handleSave(draft: EventDraft) {
    if (modalMode === "create") {
      addEntry({
        id: crypto.randomUUID(),
        title: draft.title,
        category: draft.category,
        day: draft.day,
        startTime: draft.startTime,
        endTime: draft.endTime,
        color: draft.color,
        notes: draft.notes || undefined,
      });
      toast.success("Event added");
    } else if (draft.id) {
      updateEntry(draft.id, {
        title: draft.title,
        category: draft.category,
        day: draft.day,
        startTime: draft.startTime,
        endTime: draft.endTime,
        color: draft.color,
        notes: draft.notes || undefined,
      });
      toast.success("Event updated");
    }
    setModalOpen(false);
  }

  function handleDelete() {
    if (modalDraft.id) {
      removeEntry(modalDraft.id);
      toast.success("Event deleted");
    }
    setModalOpen(false);
  }

  function handleDropOnSlot(day: DayOfWeek, slotIdx: number) {
    if (!dragState) return;
    const entry = entries.find((e) => e.id === dragState.entryId);
    if (!entry) return;
    const duration = toMinutes(entry.endTime) - toMinutes(entry.startTime);
    const newStart = slotToMinutes(slotIdx);
    const newEnd = newStart + duration;
    if (newEnd > END_HOUR * 60 + 60) {
      toast.error("Can't drop past the end of day");
      return;
    }
    const clash = entries.some(
      (e) =>
        e.id !== entry.id &&
        e.day === day &&
        toMinutes(e.startTime) < newEnd &&
        newStart < toMinutes(e.endTime)
    );
    if (clash) {
      toast.error("Slot is already occupied");
      return;
    }
    updateEntry(entry.id, {
      day,
      startTime: fromMinutes(newStart),
      endTime: fromMinutes(newEnd),
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const result = parseIcs(text);
      if (result.errors.length && result.entries.length === 0) {
        toast.error(result.errors[0] || "Failed to parse .ics file");
        return;
      }
      if (result.entries.length === 0) {
        toast.error("No weekly events found in this file");
        return;
      }
      // Deduplicate + respect existing events (skip clashes)
      let imported = 0;
      let skippedOverlap = 0;
      const current = [...useTimetableStore.getState().entries];
      for (const ev of result.entries) {
        const clash = current.some(
          (e) => e.day === ev.day && overlaps(ev, e)
        );
        if (clash) {
          skippedOverlap++;
          continue;
        }
        current.push(ev);
        imported++;
      }
      setEntries(current);
      const parts = [`${imported} event${imported === 1 ? "" : "s"} imported`];
      if (result.skipped) parts.push(`${result.skipped} skipped`);
      if (skippedOverlap) parts.push(`${skippedOverlap} overlapping`);
      toast.success(parts.join(" · "));
    } catch {
      toast.error("Couldn't read file");
    }
  }

  function handleExport() {
    if (entries.length === 0) {
      toast.error("No events to export");
      return;
    }
    const ics = exportIcs(entries, weekStart);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexus-timetable-${weekStart.toISOString().slice(0, 10)}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Schedule exported");
  }

  function handlePrint() {
    window.print();
  }

  function handleClearAll() {
    setEntries([]);
    toast.success("Schedule cleared");
  }

  if (!mounted) return <div className="h-[60vh]" />;

  const visibleDays: DayOfWeek[] = isMobile ? [DAYS_ORDER[mobileDayIdx]] : DAYS_ORDER;

  return (
    <ModuleGuard moduleId="timetable">
      <div className="space-y-4 pb-12">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <h1 className="text-2xl font-bold">Timetable</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileRef}
              type="file"
              accept=".ics,text/calendar"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              className="gap-1.5 rounded-full"
            >
              <Upload className="size-3.5" />
              Import .ics
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-1.5 rounded-full"
            >
              <Download className="size-3.5" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 rounded-full"
            >
              <Printer className="size-3.5" />
              Print
            </Button>
            {entries.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 rounded-full text-muted-foreground"
                    />
                  }
                >
                  <Trash2 className="size-3.5" />
                  Clear
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all {entries.length} events?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure? This wipes the entire schedule and can&apos;t be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAll}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Clear schedule
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous week"
              onClick={() =>
                isMobile
                  ? setMobileDayIdx((i) => {
                      if (i > 0) return i - 1;
                      setWeekStart((w) => addDays(w, -7));
                      return 6;
                    })
                  : setWeekStart((w) => addDays(w, -7))
              }
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setWeekStart(getWeekStart(new Date()));
                if (isMobile) {
                  const today = new Date().getDay();
                  const idx = DAYS_ORDER.indexOf(today as DayOfWeek);
                  setMobileDayIdx(idx === -1 ? 0 : idx);
                }
              }}
              className="rounded-full"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next week"
              onClick={() =>
                isMobile
                  ? setMobileDayIdx((i) => {
                      if (i < 6) return i + 1;
                      setWeekStart((w) => addDays(w, 7));
                      return 0;
                    })
                  : setWeekStart((w) => addDays(w, 7))
              }
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground tabular-nums">
            {weekStart.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
            {" – "}
            {addDays(weekStart, 6).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </div>
          <Button
            onClick={() => openCreate(DAYS_ORDER[mobileDayIdx] ?? 1, 9 * 60)}
            className="gap-1.5 rounded-full"
            size="sm"
          >
            <Plus className="size-4" />
            New event
          </Button>
        </div>

        {/* Grid */}
        <div
          ref={gridRef}
          className="rounded-2xl border bg-card/80 backdrop-blur-sm overflow-hidden print:border-0 print:bg-white"
        >
          {/* Header row */}
          <div
            className="grid border-b bg-muted/30"
            style={{
              gridTemplateColumns: `64px repeat(${visibleDays.length}, minmax(0, 1fr))`,
            }}
          >
            <div className="p-2 text-xs text-muted-foreground text-right">Time</div>
            {visibleDays.map((d) => {
              const offset = (d === 0 ? 6 : d - 1);
              const date = addDays(weekStart, offset);
              const isToday = isSameDate(date, today);
              return (
                <div
                  key={d}
                  className={cn(
                    "p-2 text-center border-l border-border/60",
                    isToday && "bg-primary/10 text-primary font-semibold"
                  )}
                >
                  <div className="text-xs font-medium uppercase tracking-wide">
                    {DAY_NAMES[d]}
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                    {formatHeaderDate(date).split(" ").slice(1).join(" ")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Body */}
          <div
            className="grid relative"
            style={{
              gridTemplateColumns: `64px repeat(${visibleDays.length}, minmax(0, 1fr))`,
            }}
          >
            {/* Time axis */}
            <div className="relative" style={{ height: SLOTS * SLOT_PX }}>
              {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, hi) => {
                const hour = START_HOUR + hi;
                return (
                  <div
                    key={hour}
                    className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums"
                    style={{ top: hi * 2 * SLOT_PX }}
                  >
                    {formatTimeLabel(`${String(hour).padStart(2, "0")}:00`)}
                  </div>
                );
              })}
            </div>

            {visibleDays.map((d) => {
              const offset = (d === 0 ? 6 : d - 1);
              const date = addDays(weekStart, offset);
              const isToday = isSameDate(date, today);
              return (
                <DayColumn
                  key={d}
                  day={d}
                  date={date}
                  isToday={isToday}
                  entries={entriesByDay.get(d) ?? []}
                  onSlotClick={openCreate}
                  onEventClick={openEdit}
                  onDrop={handleDropOnSlot}
                  dragState={dragState}
                  setDragState={setDragState}
                  invalidTarget={false}
                />
              );
            })}
          </div>
        </div>

        {/* Category legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs print:hidden">
          {(Object.keys(CATEGORY_LABELS) as TimetableCategory[]).map((cat) => (
            <div key={cat} className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[cat] }}
              />
              {CATEGORY_LABELS[cat]}
            </div>
          ))}
        </div>

        <EventModal
          open={modalOpen}
          mode={modalMode}
          initial={modalDraft}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          onDelete={modalMode === "edit" ? handleDelete : undefined}
          entries={entries}
        />
      </div>
    </ModuleGuard>
  );
}

function makeEmptyDraft(): EventDraft {
  return {
    title: "",
    category: "class",
    day: 1,
    startTime: "09:00",
    endTime: "10:00",
    color: CATEGORY_COLORS.class,
    notes: "",
  };
}
