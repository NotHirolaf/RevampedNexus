"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  RefreshCw,
  Bell,
  BellOff,
  FileText,
  Users,
  ClipboardList,
  Star,
  GraduationCap,
  CalendarRange,
  List as ListIcon,
  CalendarPlus,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ModuleGuard } from "@/components/modules/module-guard";
import { useMounted } from "@/hooks/use-hydration";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useEventStore, type StoredEvent, type ExtendedEventType } from "@/stores/useEventStore";
import { useGradeStore } from "@/stores/useGradeStore";
import { useCanvasStore } from "@/stores/useCanvasStore";
import { useModuleStore } from "@/stores/module-store";
import { cn } from "@/lib/utils";
import {
  scheduleReminders,
  ensureNotificationPermission,
} from "./reminder-scheduler";

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_META: Record<
  ExtendedEventType,
  { label: string; emoji: string; color: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  exam: { label: "Exam", emoji: "📝", color: "#ef4444", Icon: FileText },
  assignment: { label: "Assignment", emoji: "📄", color: "#f97316", Icon: ClipboardList },
  meeting: { label: "Meeting", emoji: "👥", color: "#3b82f6", Icon: Users },
  registration: { label: "Registration", emoji: "📋", color: "#a855f7", Icon: CalendarPlus },
  custom: { label: "Custom", emoji: "⭐", color: "#6b7280", Icon: Star },
  // Legacy types from useCanvasSync output
  deadline: { label: "Deadline", emoji: "⏰", color: "#f97316", Icon: ClipboardList },
  lab: { label: "Lab", emoji: "🧪", color: "#06b6d4", Icon: FileText },
  lecture: { label: "Lecture", emoji: "🎓", color: "#3b82f6", Icon: GraduationCap },
};

const SPEC_TYPES: ExtendedEventType[] = [
  "exam",
  "assignment",
  "meeting",
  "registration",
  "custom",
];

const REMINDER_OPTIONS: { value: string; label: string; minutes: number | null }[] = [
  { value: "none", label: "None", minutes: null },
  { value: "at", label: "At event time", minutes: 0 },
  { value: "5", label: "5 min before", minutes: 5 },
  { value: "15", label: "15 min before", minutes: 15 },
  { value: "30", label: "30 min before", minutes: 30 },
  { value: "60", label: "1 hour before", minutes: 60 },
  { value: "1440", label: "1 day before", minutes: 1440 },
];

const RECURRING_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

// ─── Date helpers ───────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return formatDateISO(d);
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDaysISO(s: string, days: number): string {
  const d = parseDateISO(s);
  d.setDate(d.getDate() + days);
  return formatDateISO(d);
}

function addMonthsISO(s: string, months: number): string {
  const d = parseDateISO(s);
  d.setMonth(d.getMonth() + months);
  return formatDateISO(d);
}

function eventDateTime(ev: StoredEvent): Date {
  if (ev.time) return new Date(`${ev.date}T${ev.time}`);
  return new Date(`${ev.date}T00:00:00`);
}

function formatTime(time: string | null | undefined): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function relativeDateLabel(dateISO: string): string {
  const today = todayISO();
  const tomorrow = addDaysISO(today, 1);
  if (dateISO === today) return "Today";
  if (dateISO === tomorrow) return "Tomorrow";

  const target = parseDateISO(dateISO);
  const now = parseDateISO(today);
  const diffDays = Math.round(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays > 1 && diffDays <= 7) {
    return target.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }
  if (diffDays > 7 && diffDays <= 14) {
    return `Next Week · ${target.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`;
  }
  return target.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: target.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

// ─── Recurring helper ──────────────────────────────────────────────────────

function generateRecurringDates(
  startDate: string,
  pattern: "weekly" | "biweekly" | "monthly",
  monthsAhead = 6
): string[] {
  const dates: string[] = [];
  const end = parseDateISO(addMonthsISO(startDate, monthsAhead));
  let current = parseDateISO(startDate);
  // Skip the first one — caller adds the seed event itself.
  for (let i = 0; i < 100; i++) {
    if (pattern === "weekly") current.setDate(current.getDate() + 7);
    else if (pattern === "biweekly") current.setDate(current.getDate() + 14);
    else current.setMonth(current.getMonth() + 1);
    if (current.getTime() > end.getTime()) break;
    dates.push(formatDateISO(current));
  }
  return dates;
}

// ─── Event modal ────────────────────────────────────────────────────────────

interface EventModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  draft: Partial<StoredEvent> | null;
  showCourseField: boolean;
  courseOptions: { id: string; name: string; color: string }[];
}

function EventModal({
  open,
  onOpenChange,
  draft,
  showCourseField,
  courseOptions,
}: EventModalProps) {
  const addEvent = useEventStore((s) => s.addEvent);
  const addEvents = useEventStore((s) => s.addEvents);
  const updateEvent = useEventStore((s) => s.updateEvent);
  const updateRecurringGroup = useEventStore((s) => s.updateRecurringGroup);

  const editing = !!draft?.id;
  const isCanvas = draft?.source === "canvas";
  const isRecurring = !!draft?.recurringGroupId;

  const [title, setTitle] = useState("");
  const [type, setType] = useState<ExtendedEventType>("custom");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [courseId, setCourseId] = useState("");
  const [courseTagText, setCourseTagText] = useState("");
  const [recurring, setRecurring] = useState<string>("none");
  const [reminder, setReminder] = useState<string>("none");
  const [description, setDescription] = useState("");
  const [editScope, setEditScope] = useState<"single" | "series">("single");

  useEffect(() => {
    if (!open) return;
    setTitle(draft?.title ?? "");
    setType((draft?.type as ExtendedEventType) ?? "custom");
    setDate(draft?.date ?? todayISO());
    setTime(draft?.time ?? "");
    setCourseId(draft?.courseId ?? "");
    setCourseTagText(draft?.courseTag ?? "");
    const rec = draft?.recurring;
    setRecurring(rec ?? "none");
    const rem = draft?.reminder;
    setReminder(
      rem == null
        ? "none"
        : REMINDER_OPTIONS.find((o) => o.minutes === rem)?.value ?? "none"
    );
    setDescription(draft?.description ?? "");
    setEditScope("single");
  }, [open, draft]);

  async function handleSave() {
    const t = title.trim();
    if (!t) return;

    const remMinutes =
      REMINDER_OPTIONS.find((o) => o.value === reminder)?.minutes ?? null;

    if (remMinutes != null) {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        toast.message("Reminders enabled, but browser notifications are off.");
      }
    }

    if (editing && draft?.id) {
      const partial: Partial<StoredEvent> = {
        description,
        reminder: remMinutes,
        courseId: courseId || null,
        courseTag: courseTagText || null,
      };
      if (!isCanvas) {
        partial.title = t;
        partial.type = type;
        partial.date = date;
        partial.time = time || null;
      }
      if (isRecurring && editScope === "series") {
        updateRecurringGroup(
          draft.recurringGroupId!,
          partial,
          draft.date
        );
      } else {
        updateEvent(draft.id, partial);
      }
      toast.success("Event updated");
    } else {
      const baseId = crypto.randomUUID();
      const recurringPattern =
        recurring === "weekly" || recurring === "biweekly" || recurring === "monthly"
          ? recurring
          : null;
      const groupId = recurringPattern ? crypto.randomUUID() : null;

      const base: StoredEvent = {
        id: baseId,
        title: t,
        description,
        type,
        date,
        time: time || null,
        endTime: null,
        allDay: !time,
        courseId: courseId || null,
        courseTag: courseTagText || null,
        recurring: recurringPattern,
        recurringGroupId: groupId,
        reminder: remMinutes,
        createdAt: new Date().toISOString(),
        source: "manual",
        canvasEventId: null,
        canvasCourseId: null,
        canvasUrl: null,
      };

      if (recurringPattern && groupId) {
        const extraDates = generateRecurringDates(date, recurringPattern, 6);
        const series: StoredEvent[] = [
          base,
          ...extraDates.map((d) => ({
            ...base,
            id: crypto.randomUUID(),
            date: d,
            createdAt: new Date().toISOString(),
          })),
        ];
        addEvents(series);
        toast.success(`Recurring event added (${series.length} occurrences)`);
      } else {
        addEvent(base);
        toast.success("Event added");
      }
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl">
        <div className="bg-card px-5 py-5 space-y-4 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="items-center gap-2 space-y-0 pb-1">
            <div className="flex items-center justify-center size-11 rounded-2xl bg-primary/10 dark:bg-primary/20 mb-1">
              <CalendarDays className="size-5 text-primary" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              {editing ? "Edit Event" : "New Event"}
            </DialogTitle>
          </DialogHeader>

          {isCanvas && (
            <div className="rounded-lg bg-muted/60 text-xs px-3 py-2 text-muted-foreground border">
              Synced from Canvas — core details can only be changed on Canvas.
            </div>
          )}
          {draft?.cancelledOnCanvas && (
            <div className="rounded-lg bg-destructive/10 text-xs px-3 py-2 text-destructive border border-destructive/30 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" />
              Cancelled on Canvas
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              placeholder="Event title"
              value={title}
              disabled={isCanvas}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-medium">Type</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {SPEC_TYPES.map((t) => {
                const meta = TYPE_META[t];
                const active = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={isCanvas}
                    onClick={() => setType(t)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 py-2 rounded-lg text-[11px] font-medium transition-all border",
                      active
                        ? "border-transparent text-white shadow-sm"
                        : "border-input bg-muted/40 hover:bg-muted text-muted-foreground",
                      isCanvas && "opacity-60 cursor-not-allowed"
                    )}
                    style={active ? { backgroundColor: meta.color } : undefined}
                  >
                    <span className="text-base leading-none">{meta.emoji}</span>
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={date}
                disabled={isCanvas}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Time</Label>
              <Input
                type="time"
                value={time}
                disabled={isCanvas}
                onChange={(e) => setTime(e.target.value)}
                className="rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium">Course</Label>
            {showCourseField && courseOptions.length > 0 ? (
              <Select
                value={courseId || "__none__"}
                onValueChange={(v) => setCourseId(v == null || v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No course</SelectItem>
                  {courseOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Optional course tag"
                value={courseTagText}
                onChange={(e) => setCourseTagText(e.target.value)}
                className="rounded-lg"
              />
            )}
          </div>

          {!editing && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Repeat</Label>
              <Select value={recurring} onValueChange={(v) => setRecurring(v ?? "")}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue>
                    {RECURRING_OPTIONS.find((o) => o.value === recurring)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {RECURRING_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Bell className="size-3" />
              Reminder
            </Label>
            <Select value={reminder} onValueChange={(v) => setReminder(v ?? "")}>
              <SelectTrigger className="rounded-lg">
                <SelectValue>
                  {REMINDER_OPTIONS.find((o) => o.value === reminder)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {REMINDER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details"
              rows={3}
              className="rounded-lg resize-none"
            />
          </div>

          {editing && isRecurring && (
            <div className="space-y-1.5 rounded-lg border p-3 bg-muted/40">
              <Label className="text-xs text-muted-foreground font-medium">
                Apply changes to
              </Label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditScope("single")}
                  className={cn(
                    "flex-1 py-1.5 rounded-md text-xs font-medium transition-colors",
                    editScope === "single"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  This event only
                </button>
                <button
                  type="button"
                  onClick={() => setEditScope("series")}
                  className={cn(
                    "flex-1 py-1.5 rounded-md text-xs font-medium transition-colors",
                    editScope === "series"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  This &amp; future events
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-1">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim()}
              className="rounded-full px-5"
            >
              {editing ? "Save" : "Add Event"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Day panel ──────────────────────────────────────────────────────────────

function DayPanel({
  dateISO,
  open,
  onOpenChange,
  events,
  courseLookup,
  onEdit,
  onDelete,
  onAdd,
}: {
  dateISO: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  events: StoredEvent[];
  courseLookup: Map<string, { name: string; color: string }>;
  onEdit: (ev: StoredEvent) => void;
  onDelete: (ev: StoredEvent) => void;
  onAdd: (dateISO: string) => void;
}) {
  const isMobile = useMediaQuery("(max-width: 640px)");
  if (!dateISO) return null;

  const d = parseDateISO(dateISO);
  const heading = d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "p-0 flex flex-col gap-0",
          isMobile ? "max-h-[80vh] rounded-t-2xl" : "sm:max-w-md"
        )}
      >
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center justify-between gap-2">
            <span>{heading}</span>
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {events.length} {events.length === 1 ? "event" : "events"}
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarDays className="size-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Nothing scheduled.
              </p>
              <Button size="sm" onClick={() => onAdd(dateISO)} className="gap-1.5">
                <Plus className="size-3.5" />
                Add event
              </Button>
            </div>
          ) : (
            events.map((ev) => {
              const meta = TYPE_META[ev.type] ?? TYPE_META.custom;
              const Icon = meta.Icon;
              const courseColor =
                (ev.courseId && courseLookup.get(ev.courseId)?.color) || meta.color;
              const courseName =
                (ev.courseId && courseLookup.get(ev.courseId)?.name) || ev.courseTag;
              return (
                <div
                  key={ev.id}
                  className={cn(
                    "group rounded-lg border bg-card p-3 hover:border-border hover:shadow-sm transition-all cursor-pointer",
                    ev.cancelledOnCanvas && "opacity-60"
                  )}
                  onClick={() => onEdit(ev)}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="mt-0.5 size-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${courseColor}1f`, color: courseColor }}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-1.5">
                        <p
                          className={cn(
                            "font-medium text-sm leading-snug flex-1",
                            ev.cancelledOnCanvas && "line-through"
                          )}
                        >
                          {ev.title}
                        </p>
                        {ev.reminder != null && (
                          <Bell className="size-3 text-amber-500 mt-0.5 shrink-0" />
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        {ev.time && <span>{formatTime(ev.time)}</span>}
                        {courseName && (
                          <span
                            className="inline-flex items-center gap-1 font-medium"
                            style={{ color: courseColor }}
                          >
                            <span
                              className="size-1.5 rounded-full"
                              style={{ backgroundColor: courseColor }}
                            />
                            {courseName}
                          </span>
                        )}
                        {ev.source === "canvas" && <CanvasBadge />}
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onEdit(ev)}
                        aria-label="Edit"
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onDelete(ev)}
                        aria-label="Delete"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {events.length > 0 && (
          <div className="border-t p-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAdd(dateISO)}
              className="w-full gap-1.5"
            >
              <Plus className="size-3.5" />
              Add another event
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Calendar grid ──────────────────────────────────────────────────────────

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarMonth({
  monthStart,
  eventsByDate,
  courseLookup,
  onSelectDate,
}: {
  monthStart: Date;
  eventsByDate: Map<string, StoredEvent[]>;
  courseLookup: Map<string, { name: string; color: string }>;
  onSelectDate: (dateISO: string) => void;
}) {
  const todayStr = todayISO();
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstDay = new Date(year, month, 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay()); // start on Sunday

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, idx) => {
          const iso = formatDateISO(d);
          const inMonth = d.getMonth() === month;
          const isToday = iso === todayStr;
          const dayEvents = eventsByDate.get(iso) ?? [];
          const visibleDots = dayEvents.slice(0, 3);
          const moreCount = dayEvents.length - visibleDots.length;

          return (
            <button
              type="button"
              key={idx}
              onClick={() => onSelectDate(iso)}
              className={cn(
                "min-h-[5.5rem] sm:min-h-[6.5rem] border-b border-r p-1.5 text-left flex flex-col gap-1 transition-colors hover:bg-muted/40 focus:outline-none focus:bg-muted/60",
                (idx + 1) % 7 === 0 && "border-r-0",
                idx >= 35 && "border-b-0",
                !inMonth && "bg-muted/20 text-muted-foreground/60"
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center size-6 rounded-full text-xs font-medium",
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                )}
              >
                {d.getDate()}
              </span>
              <div className="flex flex-col gap-0.5 mt-auto">
                {visibleDots.map((ev) => {
                  const meta = TYPE_META[ev.type] ?? TYPE_META.custom;
                  const color =
                    (ev.courseId && courseLookup.get(ev.courseId)?.color) ||
                    meta.color;
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center gap-1 text-[10px] leading-tight"
                      title={ev.title}
                    >
                      <span
                        className="size-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span
                        className={cn(
                          "truncate",
                          ev.cancelledOnCanvas && "line-through opacity-70"
                        )}
                      >
                        {ev.title}
                      </span>
                    </div>
                  );
                })}
                {moreCount > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{moreCount} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── List view ──────────────────────────────────────────────────────────────

function ListView({
  events,
  courseLookup,
  onEdit,
  onDelete,
}: {
  events: StoredEvent[];
  courseLookup: Map<string, { name: string; color: string }>;
  onEdit: (ev: StoredEvent) => void;
  onDelete: (ev: StoredEvent) => void;
}) {
  const [showPast, setShowPast] = useState(false);
  const today = todayISO();

  const upcoming = events.filter((e) => e.date >= today);
  const past = events.filter((e) => e.date < today);

  upcoming.sort((a, b) =>
    eventDateTime(a).getTime() - eventDateTime(b).getTime()
  );
  past.sort((a, b) =>
    eventDateTime(b).getTime() - eventDateTime(a).getTime()
  );

  const groups = useMemo(() => {
    const map = new Map<string, StoredEvent[]>();
    for (const ev of upcoming) {
      const key = ev.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return Array.from(map.entries());
  }, [upcoming]);

  return (
    <div className="space-y-5">
      {groups.length === 0 && (
        <div className="rounded-xl border border-dashed py-12 text-center">
          <CalendarDays className="size-10 text-muted-foreground/40 mb-2 mx-auto" />
          <p className="text-sm text-muted-foreground">
            No upcoming events.
          </p>
        </div>
      )}

      {groups.map(([date, items]) => (
        <div key={date} className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            {relativeDateLabel(date)}
          </h2>
          <div className="space-y-2">
            {items.map((ev) => (
              <ListRow
                key={ev.id}
                ev={ev}
                courseLookup={courseLookup}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}

      {past.length > 0 && (
        <div className="pt-3">
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            {showPast ? "Hide" : "Show"} past events ({past.length})
          </button>
          <AnimatePresence initial={false}>
            {showPast && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pt-3 opacity-70">
                  {past.map((ev) => (
                    <ListRow
                      key={ev.id}
                      ev={ev}
                      courseLookup={courseLookup}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function ListRow({
  ev,
  courseLookup,
  onEdit,
  onDelete,
}: {
  ev: StoredEvent;
  courseLookup: Map<string, { name: string; color: string }>;
  onEdit: (ev: StoredEvent) => void;
  onDelete: (ev: StoredEvent) => void;
}) {
  const meta = TYPE_META[ev.type] ?? TYPE_META.custom;
  const Icon = meta.Icon;
  const courseColor =
    (ev.courseId && courseLookup.get(ev.courseId)?.color) || meta.color;
  const courseName =
    (ev.courseId && courseLookup.get(ev.courseId)?.name) || ev.courseTag;

  return (
    <div
      className={cn(
        "group rounded-lg border bg-card hover:border-border hover:shadow-sm transition-all overflow-hidden",
        ev.cancelledOnCanvas && "opacity-60"
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <div
          className="size-9 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${courseColor}1f`, color: courseColor }}
        >
          <Icon className="size-4" />
        </div>
        <button
          type="button"
          onClick={() => onEdit(ev)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-start gap-1.5">
            <p
              className={cn(
                "text-sm font-medium leading-snug flex-1 truncate",
                ev.cancelledOnCanvas && "line-through"
              )}
            >
              {ev.title}
            </p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span>
              {parseDateISO(ev.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
            {ev.time && <span>{formatTime(ev.time)}</span>}
            {courseName && (
              <span
                className="inline-flex items-center gap-1 font-medium"
                style={{ color: courseColor }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: courseColor }}
                />
                {courseName}
              </span>
            )}
            {ev.source === "canvas" && <CanvasBadge />}
            {ev.cancelledOnCanvas && (
              <Badge variant="outline" className="text-[10px] gap-1 text-destructive border-destructive/40 py-0 h-5">
                <AlertTriangle className="size-3" />
                Cancelled
              </Badge>
            )}
          </div>
        </button>
        <div className="flex items-center gap-1">
          {ev.reminder != null ? (
            <Bell className="size-3.5 text-amber-500" />
          ) : (
            <BellOff className="size-3.5 text-muted-foreground/40" />
          )}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onEdit(ev)}
              aria-label="Edit"
            >
              <Pencil className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onDelete(ev)}
              aria-label="Delete"
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sync status ────────────────────────────────────────────────────────────

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
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <RefreshCw className="size-3 animate-spin" />
          Syncing...
        </span>
      ) : (
        relLabel && (
          <span className="text-xs text-muted-foreground">
            Last synced: {relLabel}
          </span>
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

// ─── Main view ──────────────────────────────────────────────────────────────

export function EventsView() {
  const mounted = useMounted();
  const items = useEventStore((s) => s.items);
  const view = useEventStore((s) => s.view);
  const setView = useEventStore((s) => s.setView);
  const sourceFilter = useEventStore((s) => s.sourceFilter);
  const setSourceFilter = useEventStore((s) => s.setSourceFilter);
  const removeEvent = useEventStore((s) => s.removeEvent);
  const removeRecurringGroup = useEventStore((s) => s.removeRecurringGroup);

  const gradesEnabled = useModuleStore((s) => s.enabledModules["grades"] ?? false);
  const canvasConnected = useCanvasStore((s) => s.isConnected);
  const gradeCourses = useGradeStore((s) => s.courses);
  const canvasCourses = useCanvasStore((s) => s.courses);

  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDraft, setModalDraft] = useState<Partial<StoredEvent> | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StoredEvent | null>(null);

  // Schedule browser-notification reminders whenever events change.
  useEffect(() => {
    if (!mounted) return;
    scheduleReminders(items);
  }, [mounted, items]);

  const courseLookup = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    if (gradesEnabled) {
      for (const c of gradeCourses) {
        map.set(c.id, { name: c.name, color: c.color });
      }
    }
    for (const c of canvasCourses) {
      map.set(`canvas:${c.id}`, {
        name: c.course_code || c.name,
        color: "#6366f1",
      });
    }
    return map;
  }, [gradesEnabled, gradeCourses, canvasCourses]);

  const manualCourseOptions = gradesEnabled
    ? gradeCourses.map((c) => ({ id: c.id, name: c.name, color: c.color }))
    : [];

  const filtered = useMemo(() => {
    if (sourceFilter === "all") return items;
    return items.filter((e) => e.source === sourceFilter);
  }, [items, sourceFilter]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, StoredEvent[]>();
    for (const ev of filtered) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        const at = a.time ?? "";
        const bt = b.time ?? "";
        return at.localeCompare(bt);
      });
    }
    return map;
  }, [filtered]);

  function handleSelectDate(dateISO: string) {
    setSelectedDate(dateISO);
    setPanelOpen(true);
  }

  function openAddModal(dateISO?: string) {
    setModalDraft({ date: dateISO ?? todayISO(), type: "custom" });
    setModalOpen(true);
  }

  function openEditModal(ev: StoredEvent) {
    setPanelOpen(false);
    setModalDraft(ev);
    setModalOpen(true);
  }

  function confirmDelete(ev: StoredEvent) {
    setPendingDelete(ev);
  }

  function performDelete(scope: "single" | "series") {
    if (!pendingDelete) return;
    if (scope === "series" && pendingDelete.recurringGroupId) {
      removeRecurringGroup(pendingDelete.recurringGroupId, pendingDelete.date);
    } else {
      removeEvent(pendingDelete.id);
    }
    toast.success("Event deleted");
    setPendingDelete(null);
  }

  const monthLabel = monthCursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  if (!mounted) return <div className="h-[60vh]" />;

  const totalCount = items.length;
  const dayEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];

  return (
    <ModuleGuard moduleId="events">
      <div className="space-y-4 pb-12">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Events &amp; Reminders</h1>
          <div className="flex items-center gap-2">
            <SyncStatus />
            <Button
              onClick={() => openAddModal()}
              className="gap-1.5 rounded-full px-4"
            >
              <Plus className="size-4" />
              Add Event
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border p-0.5 bg-muted/40">
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                view === "calendar"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarRange className="size-3.5" />
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                view === "list"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListIcon className="size-3.5" />
              List
            </button>
          </div>

          {canvasConnected && (
            <div className="inline-flex rounded-lg border p-0.5 bg-muted/40">
              {(["all", "canvas", "manual"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSourceFilter(opt)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors",
                    sourceFilter === opt
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt === "all" ? "All" : opt}
                </button>
              ))}
            </div>
          )}

          {view === "calendar" && (
            <div className="ml-auto inline-flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  setMonthCursor(
                    new Date(
                      monthCursor.getFullYear(),
                      monthCursor.getMonth() - 1,
                      1
                    )
                  )
                }
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm font-semibold w-32 text-center">
                {monthLabel}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  setMonthCursor(
                    new Date(
                      monthCursor.getFullYear(),
                      monthCursor.getMonth() + 1,
                      1
                    )
                  )
                }
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date();
                  setMonthCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                }}
                className="ml-1"
              >
                Today
              </Button>
            </div>
          )}
        </div>

        {/* Empty state — only replaces content in list view; calendar always renders */}
        {view === "calendar" ? (
          <CalendarMonth
            monthStart={monthCursor}
            eventsByDate={eventsByDate}
            courseLookup={courseLookup}
            onSelectDate={handleSelectDate}
          />
        ) : totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
            <CalendarDays className="size-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              No events yet
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Add your first event to get started.
            </p>
            <Button onClick={() => openAddModal()} className="gap-1.5 rounded-full">
              <Plus className="size-4" />
              Add your first event
            </Button>
            {canvasConnected && (
              <p className="text-sm text-muted-foreground mt-3">
                Or <strong>Sync from Canvas</strong> to import your academic calendar.
              </p>
            )}
          </div>
        ) : (
          <ListView
            events={filtered}
            courseLookup={courseLookup}
            onEdit={openEditModal}
            onDelete={confirmDelete}
          />
        )}

        {/* Day panel */}
        <DayPanel
          dateISO={selectedDate}
          open={panelOpen}
          onOpenChange={setPanelOpen}
          events={dayEvents}
          courseLookup={courseLookup}
          onEdit={openEditModal}
          onDelete={confirmDelete}
          onAdd={(d) => {
            setPanelOpen(false);
            openAddModal(d);
          }}
        />

        {/* Event modal */}
        <EventModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          draft={modalDraft}
          showCourseField={gradesEnabled && manualCourseOptions.length > 0}
          courseOptions={manualCourseOptions}
        />

        {/* Delete confirmation */}
        <AlertDialog
          open={!!pendingDelete}
          onOpenChange={(v) => !v && setPendingDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete {pendingDelete?.recurringGroupId ? "recurring event" : "this event"}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDelete?.recurringGroupId
                  ? "Choose whether to remove just this occurrence or all future events in the series. This can't be undone."
                  : "This can't be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              {pendingDelete?.recurringGroupId && (
                <AlertDialogAction
                  onClick={() => performDelete("series")}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  This &amp; future
                </AlertDialogAction>
              )}
              <AlertDialogAction
                onClick={() => performDelete("single")}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {pendingDelete?.recurringGroupId ? "Only this one" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ModuleGuard>
  );
}
