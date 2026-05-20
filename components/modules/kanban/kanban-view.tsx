"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Kanban as KanbanIcon,
  MoreVertical,
  Trash2,
  Pencil,
  X,
  Calendar,
  GripVertical,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  rectIntersection,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import { ModuleGuard } from "@/components/modules/module-guard";
import { useMounted } from "@/hooks/use-hydration";
import { useKanbanStore } from "@/stores/useKanbanStore";
import { useGradeStore } from "@/stores/useGradeStore";
import { useModuleStore } from "@/stores/module-store";
import { cn } from "@/lib/utils";
import type {
  KanbanBoard,
  KanbanCard,
  KanbanColumn,
  KanbanPriority,
} from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<KanbanPriority, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#ef4444",
};

function formatDueLabel(iso?: string): {
  label: string;
  overdue: boolean;
  today: boolean;
} | null {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(iso + "T00:00:00");
  const diff = Math.round(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return { label: "Overdue", overdue: true, today: false };
  if (diff === 0) return { label: "Today", overdue: false, today: true };
  if (diff === 1) return { label: "Tomorrow", overdue: false, today: false };
  if (diff < 7)
    return {
      label: due.toLocaleDateString(undefined, { weekday: "short" }),
      overdue: false,
      today: false,
    };
  return {
    label: due.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    overdue: false,
    today: false,
  };
}

// ─── Drag types ───────────────────────────────────────────────────────────

type DragData =
  | { type: "card"; cardId: string; columnId: string }
  | { type: "column"; columnId: string };

// ─── Card ─────────────────────────────────────────────────────────────────

function CardItem({
  card,
  columnId,
  courseLookup,
  onClick,
}: {
  card: KanbanCard;
  columnId: string;
  courseLookup: Map<string, { name: string; color: string }>;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: "card", cardId: card.id, columnId } satisfies DragData,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const due = formatDueLabel(card.dueDate);
  const course = card.courseTag ? courseLookup.get(card.courseTag) : null;
  const priorityColor = card.priority ? PRIORITY_COLORS[card.priority] : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "group relative rounded-lg border bg-card text-sm cursor-grab active:cursor-grabbing",
        "hover:border-foreground/20 hover:shadow-sm transition-all",
        "touch-none"
      )}
    >
      {priorityColor && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
          style={{ backgroundColor: priorityColor }}
        />
      )}
      <div className={cn("p-3 space-y-1.5", priorityColor && "pl-3.5")}>
        <p className="font-medium leading-snug">{card.title}</p>
        {card.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {card.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {course && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
              style={{ backgroundColor: course.color }}
            >
              {course.name}
            </span>
          )}
          {!course && card.courseTag && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted">
              {card.courseTag}
            </span>
          )}
          {due && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px]",
                due.overdue
                  ? "text-red-600 dark:text-red-400 font-medium"
                  : due.today
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              <Calendar className="size-3" />
              {due.label}
            </span>
          )}
          {card.labels?.map((l) => (
            <span
              key={l}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground"
            >
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────

function ColumnView({
  board,
  column,
  courseLookup,
  onCardClick,
  onRenameColumn,
  onDeleteColumn,
}: {
  board: KanbanBoard;
  column: KanbanColumn;
  courseLookup: Map<string, { name: string; color: string }>;
  onCardClick: (card: KanbanCard, columnId: string) => void;
  onRenameColumn: (columnId: string, name: string) => void;
  onDeleteColumn: (columnId: string) => void;
}) {
  const addCard = useKanbanStore((s) => s.addCard);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(column.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: "column", columnId: column.id } satisfies DragData,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function handleAddCard() {
    const t = newTitle.trim();
    if (!t) {
      setAdding(false);
      setNewTitle("");
      return;
    }
    addCard(board.id, column.id, {
      id: crypto.randomUUID(),
      title: t,
      createdAt: new Date().toISOString(),
    });
    setNewTitle("");
    setAdding(true); // keep input open for fast entry
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "shrink-0 w-[280px] flex flex-col rounded-xl border bg-muted/40 dark:bg-muted/20",
        isDragging && "shadow-lg"
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b">
        <button
          type="button"
          className="touch-none flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
          aria-label="Drag column"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        {renaming ? (
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => {
              const v = renameValue.trim();
              if (v) onRenameColumn(column.id, v);
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = renameValue.trim();
                if (v) onRenameColumn(column.id, v);
                setRenaming(false);
              } else if (e.key === "Escape") {
                setRenameValue(column.name);
                setRenaming(false);
              }
            }}
            className="h-7 flex-1"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setRenameValue(column.name);
              setRenaming(true);
            }}
            className="flex-1 text-left font-semibold text-sm truncate"
          >
            {column.name}
          </button>
        )}
        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-background text-[11px] font-medium text-muted-foreground">
          {column.cards.length}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Add card"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-xs" aria-label="Column menu" />
            }
          >
            <MoreVertical className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setRenameValue(column.name);
                setRenaming(true);
              }}
            >
              <Pencil className="size-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDeleteColumn(column.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards */}
      <SortableContext
        items={column.cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[60px]">
          <AnimatePresence initial={false}>
            {column.cards.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                columnId={column.id}
                courseLookup={courseLookup}
                onClick={() => onCardClick(card, column.id)}
              />
            ))}
          </AnimatePresence>
          {column.cards.length === 0 && !adding && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No cards yet
            </p>
          )}
        </div>
      </SortableContext>

      {/* Add card */}
      <div className="p-2 border-t">
        {adding ? (
          <div className="space-y-2">
            <Textarea
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter card title..."
              rows={2}
              className="text-sm resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddCard();
                } else if (e.key === "Escape") {
                  setAdding(false);
                  setNewTitle("");
                }
              }}
            />
            <div className="flex items-center gap-1.5">
              <Button size="sm" onClick={handleAddCard} disabled={!newTitle.trim()}>
                Add
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setAdding(false);
                  setNewTitle("");
                }}
                aria-label="Cancel"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full text-left text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 px-2 py-1.5 rounded-md transition-colors flex items-center gap-1.5"
          >
            <Plus className="size-3.5" />
            Add a card
          </button>
        )}
      </div>
    </div>
  );
}

// ─── New Board Modal ──────────────────────────────────────────────────────

function NewBoardModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const addBoard = useKanbanStore((s) => s.addBoard);
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName("");
  }, [open]);

  function handleCreate() {
    const t = name.trim();
    if (!t) return;
    addBoard(t);
    toast.success("Board created");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>New board</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Board name <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="CHEM101 Project"
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) handleCreate();
              }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim()}>
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Card Detail Modal ────────────────────────────────────────────────────

function CardDetailModal({
  open,
  onOpenChange,
  card,
  boardId,
  columnId,
  courseOptions,
  showCourseField,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  card: KanbanCard | null;
  boardId: string;
  columnId: string;
  courseOptions: { id: string; name: string; color: string }[];
  showCourseField: boolean;
}) {
  const updateCard = useKanbanStore((s) => s.updateCard);
  const removeCard = useKanbanStore((s) => s.removeCard);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<KanbanPriority | "">("");
  const [dueDate, setDueDate] = useState("");
  const [courseTag, setCourseTag] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open || !card) return;
    setTitle(card.title);
    setDescription(card.description ?? "");
    setPriority(card.priority ?? "");
    setDueDate(card.dueDate ?? "");
    setCourseTag(card.courseTag ?? "");
    setLabels(card.labels ?? []);
    setLabelInput("");
  }, [open, card]);

  if (!card) return null;

  function save() {
    if (!card) return;
    const t = title.trim();
    if (!t) return;
    updateCard(boardId, columnId, card.id, {
      title: t,
      description: description.trim() || undefined,
      priority: priority || undefined,
      dueDate: dueDate || undefined,
      courseTag: courseTag || undefined,
      labels: labels.length > 0 ? labels : undefined,
    });
    onOpenChange(false);
  }

  function addLabel() {
    const v = labelInput.trim();
    if (!v) return;
    if (labels.includes(v)) {
      setLabelInput("");
      return;
    }
    setLabels([...labels, v]);
    setLabelInput("");
  }

  function removeLabel(l: string) {
    setLabels(labels.filter((x) => x !== l));
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Card details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Title
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-base font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Description
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Add a more detailed description..."
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Priority
                </Label>
                <Select
                  value={priority || "__none__"}
                  onValueChange={(v) =>
                    setPriority(v == null || v === "__none__" ? "" : (v as KanbanPriority))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    <SelectItem value="low">🟢 Low</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="high">🔴 High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Due date
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {showCourseField && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Course
                </Label>
                {courseOptions.length > 0 ? (
                  <Select
                    value={courseTag || "__none__"}
                    onValueChange={(v) =>
                      setCourseTag(v == null || v === "__none__" ? "" : v)
                    }
                  >
                    <SelectTrigger>
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
                    value={courseTag}
                    onChange={(e) => setCourseTag(e.target.value)}
                    placeholder="e.g. CHEM101"
                  />
                )}
              </div>
            )}

            {!showCourseField && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Course tag
                </Label>
                <Input
                  value={courseTag}
                  onChange={(e) => setCourseTag(e.target.value)}
                  placeholder="e.g. CHEM101"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Labels
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {labels.map((l) => (
                  <span
                    key={l}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs"
                  >
                    {l}
                    <button
                      type="button"
                      onClick={() => removeLabel(l)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${l}`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  placeholder="Add label..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addLabel();
                    }
                  }}
                  className="flex-1"
                />
                <Button size="sm" variant="outline" onClick={addLabel}>
                  Add
                </Button>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
                className="gap-1.5"
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={!title.trim()}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this card?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (card) removeCard(boardId, columnId, card.id);
                setConfirmDelete(false);
                onOpenChange(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Board Tab Bar ────────────────────────────────────────────────────────

function BoardTabs({
  boards,
  activeBoardId,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: {
  boards: KanbanBoard[];
  activeBoardId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {boards.map((b) => {
        const isActive = b.id === activeBoardId;
        const isRenaming = renamingId === b.id;
        return (
          <div
            key={b.id}
            className={cn(
              "group relative flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors shrink-0",
              isActive
                ? "bg-primary/15 text-primary"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
            onClick={() => !isRenaming && onSelect(b.id)}
          >
            {isRenaming ? (
              <Input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => {
                  const v = renameValue.trim();
                  if (v) onRename(b.id, v);
                  setRenamingId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = renameValue.trim();
                    if (v) onRename(b.id, v);
                    setRenamingId(null);
                  } else if (e.key === "Escape") {
                    setRenamingId(null);
                  }
                }}
                className="h-6 w-32 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="font-medium whitespace-nowrap">{b.name}</span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Board options"
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  />
                }
              >
                <MoreVertical className="size-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={() => {
                    setRenameValue(b.name);
                    setRenamingId(b.id);
                  }}
                >
                  <Pencil className="size-3.5" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(b.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
      <Button
        variant="ghost"
        size="sm"
        onClick={onNew}
        className="gap-1 shrink-0"
      >
        <Plus className="size-3.5" />
        New Board
      </Button>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────

export function KanbanView() {
  const mounted = useMounted();
  const boards = useKanbanStore((s) => s.boards);
  const activeBoardId = useKanbanStore((s) => s.activeBoardId);
  const setActiveBoard = useKanbanStore((s) => s.setActiveBoard);
  const renameBoard = useKanbanStore((s) => s.renameBoard);
  const removeBoard = useKanbanStore((s) => s.removeBoard);
  const addColumn = useKanbanStore((s) => s.addColumn);
  const renameColumn = useKanbanStore((s) => s.renameColumn);
  const removeColumn = useKanbanStore((s) => s.removeColumn);
  const reorderColumns = useKanbanStore((s) => s.reorderColumns);
  const reorderCards = useKanbanStore((s) => s.reorderCards);
  const moveCard = useKanbanStore((s) => s.moveCard);

  const gradesEnabled = useModuleStore(
    (s) => s.enabledModules["grades"] ?? false
  );
  const gradeCourses = useGradeStore((s) => s.courses);

  const courseLookup = useMemo(() => {
    const m = new Map<string, { name: string; color: string }>();
    if (gradesEnabled) {
      for (const c of gradeCourses) {
        m.set(c.id, { name: c.code || c.name, color: c.color });
      }
    }
    return m;
  }, [gradesEnabled, gradeCourses]);

  const courseOptions = useMemo(
    () =>
      gradesEnabled
        ? gradeCourses.map((c) => ({
            id: c.id,
            name: c.code || c.name,
            color: c.color,
          }))
        : [],
    [gradesEnabled, gradeCourses]
  );

  const [newBoardOpen, setNewBoardOpen] = useState(false);
  const [confirmDeleteBoardId, setConfirmDeleteBoardId] = useState<string | null>(
    null
  );
  const [confirmDeleteColumn, setConfirmDeleteColumn] = useState<{
    columnId: string;
    name: string;
  } | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const newColumnInputRef = useRef<HTMLInputElement | null>(null);

  const [openCard, setOpenCard] = useState<{
    card: KanbanCard;
    columnId: string;
  } | null>(null);

  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);

  // Ensure an active board is set
  useEffect(() => {
    if (!mounted) return;
    if (boards.length > 0 && !activeBoardId) {
      setActiveBoard(boards[0].id);
    }
  }, [mounted, boards, activeBoardId, setActiveBoard]);

  const activeBoard = useMemo(
    () => boards.find((b) => b.id === activeBoardId) ?? null,
    [boards, activeBoardId]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Collision detection: prefer pointer-within (column-level), then closest-corner.
  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) return rectCollisions;
    return closestCorners(args);
  };

  function findCardLocation(
    cardId: string
  ): { columnId: string; index: number } | null {
    if (!activeBoard) return null;
    for (const col of activeBoard.columns) {
      const idx = col.cards.findIndex((c) => c.id === cardId);
      if (idx !== -1) return { columnId: col.id, index: idx };
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragData | undefined;
    if (data) setActiveDrag(data);
  }

  function handleDragOver(event: DragOverEvent) {
    if (!activeBoard) return;
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current as DragData | undefined;
    const overData = over.data.current as DragData | undefined;
    if (!activeData || activeData.type !== "card") return;

    const fromLoc = findCardLocation(activeData.cardId);
    if (!fromLoc) return;

    // Determine the target column
    let toColumnId: string | null = null;
    let toIndex: number = -1;

    if (overData?.type === "card") {
      const overLoc = findCardLocation(overData.cardId);
      if (!overLoc) return;
      toColumnId = overLoc.columnId;
      toIndex = overLoc.index;
    } else if (overData?.type === "column") {
      toColumnId = overData.columnId;
      const col = activeBoard.columns.find((c) => c.id === toColumnId);
      toIndex = col ? col.cards.length : 0;
    } else {
      // Over may be the column container itself if items match by column.id
      const colMatch = activeBoard.columns.find((c) => c.id === over.id);
      if (colMatch) {
        toColumnId = colMatch.id;
        toIndex = colMatch.cards.length;
      }
    }

    if (!toColumnId) return;
    if (toColumnId === fromLoc.columnId) return; // Reorder handled in dragEnd

    moveCard(
      activeBoard.id,
      fromLoc.columnId,
      toColumnId,
      activeData.cardId,
      toIndex
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    if (!activeBoard) return;
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current as DragData | undefined;
    const overData = over.data.current as DragData | undefined;
    if (!activeData) return;

    if (activeData.type === "column") {
      // Reorder columns
      const ids = activeBoard.columns.map((c) => c.id);
      const oldIdx = ids.indexOf(activeData.columnId);
      const overColId =
        overData?.type === "column" ? overData.columnId : String(over.id);
      const newIdx = ids.indexOf(overColId);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
      const next = arrayMove(ids, oldIdx, newIdx);
      reorderColumns(activeBoard.id, next);
      return;
    }

    if (activeData.type === "card") {
      const fromLoc = findCardLocation(activeData.cardId);
      if (!fromLoc) return;
      let toColumnId: string;
      let toIndex: number;

      if (overData?.type === "card") {
        const overLoc = findCardLocation(overData.cardId);
        if (!overLoc) return;
        toColumnId = overLoc.columnId;
        toIndex = overLoc.index;
      } else if (overData?.type === "column") {
        toColumnId = overData.columnId;
        const col = activeBoard.columns.find((c) => c.id === toColumnId);
        toIndex = col ? col.cards.length : 0;
      } else {
        return;
      }

      if (toColumnId === fromLoc.columnId) {
        const col = activeBoard.columns.find((c) => c.id === toColumnId);
        if (!col) return;
        const ids = col.cards.map((c) => c.id);
        const oldIdx = ids.indexOf(activeData.cardId);
        const newIdx = ids.indexOf(over.id as string);
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          const next = arrayMove(ids, oldIdx, newIdx);
          reorderCards(activeBoard.id, toColumnId, next);
        }
      }
      // Cross-column moves already handled in dragOver
    }
  }

  function handleAddColumn() {
    if (!activeBoard) return;
    const t = newColumnName.trim();
    if (!t) {
      setAddingColumn(false);
      setNewColumnName("");
      return;
    }
    addColumn(activeBoard.id, t);
    setNewColumnName("");
    setAddingColumn(false);
  }

  if (!mounted) return <div className="h-[60vh]" />;

  return (
    <ModuleGuard moduleId="kanban">
      <div className="space-y-4 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Kanban</h1>
        </div>

        {boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
            <KanbanIcon className="size-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              No boards yet
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Organize your projects visually
            </p>
            <Button
              onClick={() => setNewBoardOpen(true)}
              className="gap-1.5 rounded-full"
            >
              <Plus className="size-4" />
              Create your first board
            </Button>
          </div>
        ) : (
          <>
            <BoardTabs
              boards={boards}
              activeBoardId={activeBoardId}
              onSelect={setActiveBoard}
              onNew={() => setNewBoardOpen(true)}
              onRename={renameBoard}
              onDelete={(id) => setConfirmDeleteBoardId(id)}
            />

            {activeBoard && (
              <DndContext
                sensors={sensors}
                collisionDetection={collisionDetection}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setActiveDrag(null)}
              >
                <div className="flex gap-3 overflow-x-auto pb-4 items-start min-h-[60vh]">
                  <SortableContext
                    items={activeBoard.columns.map((c) => c.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {activeBoard.columns.map((col) => (
                      <ColumnView
                        key={col.id}
                        board={activeBoard}
                        column={col}
                        courseLookup={courseLookup}
                        onCardClick={(card, columnId) =>
                          setOpenCard({ card, columnId })
                        }
                        onRenameColumn={(colId, name) =>
                          renameColumn(activeBoard.id, colId, name)
                        }
                        onDeleteColumn={(colId) =>
                          setConfirmDeleteColumn({ columnId: colId, name: col.name })
                        }
                      />
                    ))}
                  </SortableContext>

                  {/* Add column */}
                  <div className="shrink-0 w-[280px]">
                    {addingColumn ? (
                      <div className="rounded-xl border bg-muted/40 dark:bg-muted/20 p-2 space-y-2">
                        <Input
                          ref={newColumnInputRef}
                          autoFocus
                          value={newColumnName}
                          onChange={(e) => setNewColumnName(e.target.value)}
                          placeholder="Column name"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddColumn();
                            else if (e.key === "Escape") {
                              setAddingColumn(false);
                              setNewColumnName("");
                            }
                          }}
                        />
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            onClick={handleAddColumn}
                            disabled={!newColumnName.trim()}
                            className="gap-1"
                          >
                            <Check className="size-3.5" />
                            Add
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setAddingColumn(false);
                              setNewColumnName("");
                            }}
                            aria-label="Cancel"
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setAddingColumn(true)}
                        className="w-full gap-1.5 rounded-xl border-dashed h-10 text-muted-foreground"
                      >
                        <Plus className="size-4" />
                        Add Column
                      </Button>
                    )}
                  </div>
                </div>

                <DragOverlay>
                  {activeDrag?.type === "card" && activeBoard
                    ? (() => {
                        const loc = findCardLocation(activeDrag.cardId);
                        if (!loc) return null;
                        const col = activeBoard.columns.find(
                          (c) => c.id === loc.columnId
                        );
                        const card = col?.cards.find(
                          (c) => c.id === activeDrag.cardId
                        );
                        if (!card) return null;
                        return (
                          <div className="w-[260px] rotate-2">
                            <div className="rounded-lg border bg-card p-3 text-sm shadow-xl opacity-90">
                              <p className="font-medium">{card.title}</p>
                              {card.description && (
                                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                  {card.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    : null}
                  {activeDrag?.type === "column" && activeBoard
                    ? (() => {
                        const col = activeBoard.columns.find(
                          (c) => c.id === activeDrag.columnId
                        );
                        if (!col) return null;
                        return (
                          <div className="w-[280px] rotate-2">
                            <div className="rounded-xl border bg-muted shadow-xl px-3 py-2.5 text-sm font-semibold opacity-90">
                              {col.name}
                            </div>
                          </div>
                        );
                      })()
                    : null}
                </DragOverlay>
              </DndContext>
            )}
          </>
        )}

        <NewBoardModal open={newBoardOpen} onOpenChange={setNewBoardOpen} />

        {openCard && activeBoard && (
          <CardDetailModal
            open={!!openCard}
            onOpenChange={(v) => {
              if (!v) setOpenCard(null);
            }}
            card={openCard.card}
            boardId={activeBoard.id}
            columnId={openCard.columnId}
            courseOptions={courseOptions}
            showCourseField={gradesEnabled}
          />
        )}

        {/* Delete board confirmation */}
        <AlertDialog
          open={!!confirmDeleteBoardId}
          onOpenChange={(v) => {
            if (!v) setConfirmDeleteBoardId(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this board?</AlertDialogTitle>
              <AlertDialogDescription>
                All columns and cards in this board will be permanently lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmDeleteBoardId) {
                    removeBoard(confirmDeleteBoardId);
                    toast.success("Board deleted");
                  }
                  setConfirmDeleteBoardId(null);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete column confirmation */}
        <AlertDialog
          open={!!confirmDeleteColumn}
          onOpenChange={(v) => {
            if (!v) setConfirmDeleteColumn(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete &lsquo;{confirmDeleteColumn?.name}&rsquo;?
              </AlertDialogTitle>
              <AlertDialogDescription>
                All cards in this column will be permanently lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (activeBoard && confirmDeleteColumn) {
                    removeColumn(activeBoard.id, confirmDeleteColumn.columnId);
                  }
                  setConfirmDeleteColumn(null);
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
