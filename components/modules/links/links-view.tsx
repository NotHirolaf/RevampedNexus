"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Link as LinkIcon,
  Pencil,
  X,
  Globe,
  GraduationCap,
  BookOpen,
  Mail,
  Search,
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
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

import { ModuleGuard } from "@/components/modules/module-guard";
import { useMounted } from "@/hooks/use-hydration";
import { useLinkStore, type QuickLink } from "@/stores/useLinkStore";
import { useCanvasStore } from "@/stores/useCanvasStore";
import { cn } from "@/lib/utils";

const EMOJI_OPTIONS = [
  "🔗", "📚", "🎓", "📝", "📅", "📊", "💻", "🧪", "🔬",
  "📖", "📕", "📗", "📘", "📙", "✉️", "📧", "🌐", "🔍",
  "⭐", "🏫", "🎯", "💡", "📰", "🎬", "🎵", "💰", "📷",
];

function ensureHttps(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function faviconForUrl(url: string): string | undefined {
  try {
    const u = new URL(ensureHttps(url));
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(u.hostname)}&sz=64`;
  } catch {
    return undefined;
  }
}

// ─── Tile ────────────────────────────────────────────────────────────────

function LinkTile({
  link,
  onEdit,
  onDelete,
}: {
  link: QuickLink;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const [confirmDel, setConfirmDel] = useState(false);
  const [faviconBroken, setFaviconBroken] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const showEmoji = !!link.icon;
  const showFavicon = !showEmoji && !!link.faviconUrl && !faviconBroken;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative aspect-square rounded-xl border bg-card/80 backdrop-blur-sm transition-colors hover:border-border hover:bg-card",
        isDragging && "shadow-lg z-10"
      )}
    >
      <a
        href={ensureHttps(link.url)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
        {...attributes}
        {...listeners}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-muted/50">
          {showEmoji ? (
            <span className="text-2xl leading-none">{link.icon}</span>
          ) : showFavicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={link.faviconUrl}
              alt=""
              width={32}
              height={32}
              className="size-8 rounded"
              onError={() => setFaviconBroken(true)}
            />
          ) : (
            <Globe className="size-6 text-muted-foreground" />
          )}
        </span>
        <span className="w-full truncate text-center text-xs font-medium text-foreground">
          {link.name}
        </span>
      </a>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onEdit();
        }}
        aria-label="Edit link"
        className="absolute top-1.5 left-1.5 flex size-7 items-center justify-center rounded-full bg-background/90 ring-1 ring-border opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-background transition-opacity"
      >
        <Pencil className="size-3.5" />
      </button>

      <div className="absolute top-1.5 right-1.5">
        {confirmDel ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            onBlur={() => setConfirmDel(false)}
            autoFocus
            className="rounded-full bg-destructive px-2 py-1 text-[10px] font-medium text-destructive-foreground shadow"
          >
            Delete?
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setConfirmDel(true);
            }}
            aria-label="Delete link"
            className="flex size-7 items-center justify-center rounded-full bg-background/90 ring-1 ring-border opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-background transition-opacity"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────

function LinkFormModal({
  open,
  onOpenChange,
  link,
  initialName,
  initialUrl,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  link?: QuickLink | null;
  initialName?: string;
  initialUrl?: string;
}) {
  const addLink = useLinkStore((s) => s.addLink);
  const updateLink = useLinkStore((s) => s.updateLink);
  const links = useLinkStore((s) => s.links);
  const isEdit = !!link;

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState<string>("");
  const [useFavicon, setUseFavicon] = useState(true);

  useEffect(() => {
    if (!open) return;
    setName(link?.name ?? initialName ?? "");
    setUrl(link?.url ?? initialUrl ?? "");
    setIcon(link?.icon ?? "");
    setUseFavicon(!link?.icon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, link?.id]);

  function handleSubmit() {
    const trimmedName = name.trim();
    const finalUrl = ensureHttps(url);
    if (!trimmedName || !finalUrl) return;

    const fav = !useFavicon ? undefined : faviconForUrl(finalUrl);
    const finalIcon = useFavicon ? null : icon || null;

    if (isEdit && link) {
      updateLink(link.id, {
        name: trimmedName,
        url: finalUrl,
        icon: finalIcon,
        faviconUrl: useFavicon ? fav : undefined,
      });
      toast.success("Link updated");
    } else {
      addLink({
        id: crypto.randomUUID(),
        name: trimmedName,
        url: finalUrl,
        icon: finalIcon,
        faviconUrl: useFavicon ? fav : undefined,
        order: links.length,
        createdAt: new Date().toISOString(),
      });
      toast.success("Link added");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl">
        <div className="bg-card px-6 py-6 space-y-5">
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-lg font-semibold">
              {isEdit ? "Edit link" : "New link"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              placeholder="Library"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              URL <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim() && url.trim()) handleSubmit();
              }}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">
                Icon
              </Label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={useFavicon}
                  onChange={(e) => setUseFavicon(e.target.checked)}
                  className="accent-primary"
                />
                Use favicon
              </label>
            </div>

            {!useFavicon && (
              <>
                <div className="grid grid-cols-9 gap-1.5 max-h-32 overflow-y-auto p-1 rounded-xl border bg-muted/30">
                  {EMOJI_OPTIONS.map((e) => (
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
              </>
            )}
          </div>

          <div className="flex justify-between pt-1">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || !url.trim()}
              className="rounded-full px-6"
            >
              {isEdit ? "Save" : "Add link"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Suggestions ─────────────────────────────────────────────────────────

interface Suggestion {
  name: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  emoji: string;
}

function SuggestionRow({
  onPick,
}: {
  onPick: (s: { name: string; url: string }) => void;
}) {
  const canvasBaseUrl = useCanvasStore((s) => s.baseUrl);

  const suggestions: Suggestion[] = useMemo(
    () => [
      { name: "University Portal", url: "", icon: GraduationCap, emoji: "🎓" },
      {
        name: "Canvas / LMS",
        url: canvasBaseUrl ?? "",
        icon: BookOpen,
        emoji: "📚",
      },
      { name: "Library", url: "", icon: BookOpen, emoji: "📖" },
      { name: "Email", url: "", icon: Mail, emoji: "✉️" },
      {
        name: "Google Scholar",
        url: "https://scholar.google.com",
        icon: Search,
        emoji: "🔍",
      },
    ],
    [canvasBaseUrl]
  );

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Suggestions
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {suggestions.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => onPick({ name: s.name, url: s.url })}
            className="flex items-center gap-2 rounded-xl border bg-card/60 px-3 py-2 text-left hover:bg-card hover:border-border transition-colors"
          >
            <span className="text-lg shrink-0">{s.emoji}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium truncate">{s.name}</span>
              <span className="block text-[10px] text-muted-foreground">+ Add</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────

export function LinksView() {
  const mounted = useMounted();
  const links = useLinkStore((s) => s.links);
  const removeLink = useLinkStore((s) => s.removeLink);
  const reorderLinks = useLinkStore((s) => s.reorderLinks);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QuickLink | null>(null);
  const [prefill, setPrefill] = useState<{ name?: string; url?: string }>({});
  const [confirmDelete, setConfirmDelete] = useState<QuickLink | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sorted = useMemo(
    () => [...links].sort((a, b) => a.order - b.order),
    [links]
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = sorted.map((l) => l.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    reorderLinks(arrayMove(ids, oldIndex, newIndex));
  }

  function openNew(p?: { name?: string; url?: string }) {
    setEditing(null);
    setPrefill(p ?? {});
    setModalOpen(true);
  }

  function openEdit(l: QuickLink) {
    setEditing(l);
    setPrefill({});
    setModalOpen(true);
  }

  if (!mounted) return <div className="h-[60vh]" />;

  return (
    <ModuleGuard moduleId="links">
      <div className="space-y-6 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Quick Links</h1>
          <Button onClick={() => openNew()} className="gap-1.5 rounded-full px-4">
            <Plus className="size-4" />
            Add Link
          </Button>
        </div>

        {links.length === 0 ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl">
              <LinkIcon className="size-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No links yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Save your most-used university websites for quick access
              </p>
            </div>
            <SuggestionRow onPick={openNew} />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sorted.map((l) => l.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <AnimatePresence initial={false}>
                  {sorted.map((l) => (
                    <motion.div
                      key={l.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.18 }}
                    >
                      <LinkTile
                        link={l}
                        onEdit={() => openEdit(l)}
                        onDelete={() => setConfirmDelete(l)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>
        )}

        <LinkFormModal
          open={modalOpen}
          onOpenChange={(v) => {
            setModalOpen(v);
            if (!v) {
              setEditing(null);
              setPrefill({});
            }
          }}
          link={editing}
          initialName={prefill.name}
          initialUrl={prefill.url}
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
                This link will be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmDelete) {
                    removeLink(confirmDelete.id);
                    toast.success("Link deleted");
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
