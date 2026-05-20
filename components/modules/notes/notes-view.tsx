"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Bookmark,
  FileText,
  Video,
  BookOpen,
  Newspaper,
  Image as ImageIcon,
  Star,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronLeft,
  Search,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

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
import {
  useNoteStore,
  type NoteCollection,
  type ResourceLink,
  type ResourceType,
} from "@/stores/useNoteStore";
import { useGradeStore } from "@/stores/useGradeStore";
import { useModuleStore } from "@/stores/module-store";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

const NONE = "__none__";

const TYPE_META: Record<
  ResourceType,
  { label: string; emoji: string; icon: React.ComponentType<{ className?: string }> }
> = {
  notes: { label: "Notes", emoji: "📝", icon: FileText },
  video: { label: "Video", emoji: "🎥", icon: Video },
  textbook: { label: "Textbook", emoji: "📕", icon: BookOpen },
  article: { label: "Article", emoji: "📰", icon: Newspaper },
  slides: { label: "Slides", emoji: "🖼️", icon: ImageIcon },
  other: { label: "Other", emoji: "⭐", icon: Star },
};

const TYPE_ORDER: ResourceType[] = [
  "notes",
  "video",
  "textbook",
  "article",
  "slides",
  "other",
];

function ensureHttps(url: string): string {
  const t = url.trim();
  if (!t) return t;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function hostnameOf(url: string): string {
  try {
    return new URL(ensureHttps(url)).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ─── Collection modal ────────────────────────────────────────────────────

function CollectionModal({
  open,
  onOpenChange,
  collection,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  collection?: NoteCollection | null;
}) {
  const addCollection = useNoteStore((s) => s.addCollection);
  const updateCollection = useNoteStore((s) => s.updateCollection);
  const gradesEnabled = useModuleStore(
    (s) => s.enabledModules["grades"] ?? false
  );
  const gradeCourses = useGradeStore((s) => s.courses);

  const isEdit = !!collection;
  const [title, setTitle] = useState("");
  const [courseTag, setCourseTag] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(collection?.title ?? "");
    setCourseTag(collection?.courseTag ?? "");
    setDescription(collection?.description ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, collection?.id]);

  function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (isEdit && collection) {
      updateCollection(collection.id, {
        title: trimmed,
        courseTag: courseTag || undefined,
        description: description.trim() || undefined,
      });
      toast.success("Collection updated");
    } else {
      addCollection({
        id: crypto.randomUUID(),
        title: trimmed,
        courseTag: courseTag || undefined,
        description: description.trim() || undefined,
        links: [],
        createdAt: new Date().toISOString(),
      });
      toast.success("Collection created");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl">
        <div className="bg-card px-6 py-6 space-y-5">
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-lg font-semibold">
              {isEdit ? "Edit collection" : "New collection"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              placeholder="CHEM101 Resources"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Course tag
            </Label>
            {gradesEnabled && gradeCourses.length > 0 ? (
              <Select
                value={courseTag || NONE}
                onValueChange={(v) =>
                  setCourseTag(v == null || v === NONE ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No course</SelectItem>
                  {gradeCourses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={courseTag}
                onChange={(e) => setCourseTag(e.target.value)}
                placeholder="e.g. CHEM101"
                className="rounded-xl"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Description
            </Label>
            <Textarea
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
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
              disabled={!title.trim()}
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

// ─── Resource modal ──────────────────────────────────────────────────────

function ResourceModal({
  open,
  onOpenChange,
  collectionId,
  resource,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  collectionId: string;
  resource?: ResourceLink | null;
}) {
  const addResource = useNoteStore((s) => s.addResource);
  const updateResource = useNoteStore((s) => s.updateResource);

  const isEdit = !!resource;
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ResourceType>("other");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setUrl(resource?.url ?? "");
    setTitle(resource?.title ?? "");
    setType(resource?.type ?? "other");
    setNotes(resource?.notes ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resource?.id]);

  function handleSubmit() {
    const trimmedTitle = title.trim();
    const finalUrl = ensureHttps(url);
    if (!trimmedTitle || !finalUrl) return;

    if (isEdit && resource) {
      updateResource(collectionId, resource.id, {
        title: trimmedTitle,
        url: finalUrl,
        type,
        notes: notes.trim() || undefined,
      });
      toast.success("Resource updated");
    } else {
      addResource(collectionId, {
        id: crypto.randomUUID(),
        title: trimmedTitle,
        url: finalUrl,
        type,
        notes: notes.trim() || undefined,
        addedAt: new Date().toISOString(),
      });
      toast.success("Resource added");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl">
        <div className="bg-card px-6 py-6 space-y-5">
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-lg font-semibold">
              {isEdit ? "Edit resource" : "New resource"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              URL <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Resource title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Type
            </Label>
            <div className="grid grid-cols-3 gap-1.5">
              {TYPE_ORDER.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-xs transition-colors",
                    type === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 hover:bg-muted"
                  )}
                >
                  <span className="text-base leading-none">
                    {TYPE_META[t].emoji}
                  </span>
                  <span className="font-medium">{TYPE_META[t].label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Notes
            </Label>
            <Textarea
              placeholder="Personal notes about this resource"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
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
              disabled={!title.trim() || !url.trim()}
              className="rounded-full px-6"
            >
              {isEdit ? "Save" : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Collection list (sidebar) ───────────────────────────────────────────

function CollectionList({
  collections,
  selectedId,
  onSelect,
  onNew,
}: {
  collections: NoteCollection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const gradesEnabled = useModuleStore(
    (s) => s.enabledModules["grades"] ?? false
  );
  const gradeCourses = useGradeStore((s) => s.courses);

  function tagFor(c: NoteCollection): { label: string; color?: string } | null {
    if (!c.courseTag) return null;
    if (gradesEnabled) {
      const course = gradeCourses.find((g) => g.id === c.courseTag);
      if (course) return { label: course.code || course.name, color: course.color };
    }
    return { label: c.courseTag };
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Collections
        </h2>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onNew}
          aria-label="New collection"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto">
        {collections.map((c) => {
          const tag = tagFor(c);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className={cn(
                "w-full flex flex-col items-start gap-1 rounded-lg px-3 py-2.5 text-left transition-colors",
                selectedId === c.id
                  ? "bg-primary/10 text-foreground"
                  : "hover:bg-muted/50"
              )}
            >
              <span className="w-full flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">{c.title}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {c.links.length}
                </span>
              </span>
              {tag && (
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                  style={
                    tag.color
                      ? {
                          backgroundColor: `${tag.color}22`,
                          color: tag.color,
                        }
                      : { backgroundColor: "var(--muted)" }
                  }
                >
                  {tag.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Button
        variant="outline"
        onClick={onNew}
        className="mt-3 gap-1.5 rounded-full"
      >
        <Plus className="size-4" />
        New Collection
      </Button>
    </div>
  );
}

// ─── Collection detail ───────────────────────────────────────────────────

function CollectionDetail({
  collection,
  onDeleteCollection,
  onBack,
  isMobile,
}: {
  collection: NoteCollection;
  onDeleteCollection: () => void;
  onBack?: () => void;
  isMobile?: boolean;
}) {
  const updateCollection = useNoteStore((s) => s.updateCollection);
  const removeResource = useNoteStore((s) => s.removeResource);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(collection.title);

  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(collection.description ?? "");

  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceLink | null>(
    null
  );
  const [confirmDeleteResource, setConfirmDeleteResource] =
    useState<ResourceLink | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ResourceType | "all">("all");

  useEffect(() => {
    setTitleDraft(collection.title);
    setDescDraft(collection.description ?? "");
    setEditingTitle(false);
    setEditingDesc(false);
    setSearch("");
    setTypeFilter("all");
  }, [collection.id, collection.title, collection.description]);

  function commitTitle() {
    const t = titleDraft.trim();
    if (t && t !== collection.title) {
      updateCollection(collection.id, { title: t });
    } else {
      setTitleDraft(collection.title);
    }
    setEditingTitle(false);
  }

  function commitDesc() {
    const d = descDraft.trim();
    updateCollection(collection.id, { description: d || undefined });
    setEditingDesc(false);
  }

  const gradesEnabled = useModuleStore(
    (s) => s.enabledModules["grades"] ?? false
  );
  const gradeCourses = useGradeStore((s) => s.courses);
  const tag = collection.courseTag
    ? gradesEnabled
      ? gradeCourses.find((g) => g.id === collection.courseTag) ?? null
      : { code: collection.courseTag, name: collection.courseTag, color: undefined as string | undefined }
    : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return collection.links.filter((l) => {
      if (typeFilter !== "all" && l.type !== typeFilter) return false;
      if (q && !l.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [collection.links, search, typeFilter]);

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {isMobile && onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1 -ml-2"
          >
            <ChevronLeft className="size-4" />
            Collections
          </Button>
        )}

        <div className="flex items-start justify-between gap-3">
          {editingTitle ? (
            <Input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") {
                  setTitleDraft(collection.title);
                  setEditingTitle(false);
                }
              }}
              className="text-2xl font-bold h-auto py-1"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="text-2xl font-bold text-left hover:text-foreground/80 transition-colors"
            >
              {collection.title}
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Collection options"
                />
              }
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={onDeleteCollection}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-3.5" />
                Delete collection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {tag && (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
            style={
              tag.color
                ? { backgroundColor: `${tag.color}22`, color: tag.color }
                : { backgroundColor: "var(--muted)" }
            }
          >
            {(("code" in (tag as object) ? (tag as { code?: string }).code : undefined) ??
              (tag as { name?: string }).name) || ""}
          </span>
        )}

        {editingDesc ? (
          <Textarea
            autoFocus
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            onBlur={commitDesc}
            rows={2}
            placeholder="Add a description"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingDesc(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left block w-full"
          >
            {collection.description || (
              <span className="italic opacity-60">
                Add a description…
              </span>
            )}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search resources"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 rounded-full"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter((v as ResourceType | "all") || "all")}
          >
            <SelectTrigger className="w-[140px] rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TYPE_ORDER.map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_META[t].emoji} {TYPE_META[t].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => {
            setEditingResource(null);
            setResourceModalOpen(true);
          }}
          className="gap-1.5 rounded-full"
          size="sm"
        >
          <Plus className="size-4" />
          Add Resource
        </Button>
      </div>

      {collection.links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl">
          <Bookmark className="size-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            No resources yet — add a link to get started
          </p>
          <Button
            onClick={() => {
              setEditingResource(null);
              setResourceModalOpen(true);
            }}
            className="gap-1.5 rounded-full mt-3"
            size="sm"
          >
            <Plus className="size-4" />
            Add Resource
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No matches
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {filtered.map((r) => {
              const meta = TYPE_META[r.type];
              return (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                  className="group rounded-xl border bg-card/80 backdrop-blur-sm hover:bg-card transition-colors"
                >
                  <div className="flex items-start gap-3 p-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-base">
                      {meta.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <a
                        href={ensureHttps(r.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-sm hover:text-primary transition-colors"
                      >
                        <span className="truncate">{r.title}</span>
                        <ExternalLink className="size-3 shrink-0 opacity-60" />
                      </a>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                        <span className="truncate">{hostnameOf(r.url)}</span>
                        <span>·</span>
                        <span className="inline-flex items-center rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium">
                          {meta.label}
                        </span>
                      </div>
                      {r.notes && (
                        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                          {r.notes}
                        </p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Resource options"
                            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                          />
                        }
                      >
                        <MoreVertical className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingResource(r);
                            setResourceModalOpen(true);
                          }}
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setConfirmDeleteResource(r)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <ResourceModal
        open={resourceModalOpen}
        onOpenChange={(v) => {
          setResourceModalOpen(v);
          if (!v) setEditingResource(null);
        }}
        collectionId={collection.id}
        resource={editingResource}
      />

      <AlertDialog
        open={!!confirmDeleteResource}
        onOpenChange={(v) => {
          if (!v) setConfirmDeleteResource(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &lsquo;{confirmDeleteResource?.title}&rsquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This resource will be removed from the collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDeleteResource) {
                  removeResource(collection.id, confirmDeleteResource.id);
                  toast.success("Resource deleted");
                }
                setConfirmDeleteResource(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────

export function NotesView() {
  const mounted = useMounted();
  const collections = useNoteStore((s) => s.collections);
  const removeCollection = useNoteStore((s) => s.removeCollection);

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [confirmDeleteCollection, setConfirmDeleteCollection] =
    useState<NoteCollection | null>(null);

  useEffect(() => {
    if (!isDesktop) return;
    if (collections.length > 0 && !selectedId) {
      setSelectedId(collections[0].id);
    }
    if (selectedId && !collections.find((c) => c.id === selectedId)) {
      setSelectedId(collections[0]?.id ?? null);
    }
  }, [collections, selectedId, isDesktop]);

  const selected = collections.find((c) => c.id === selectedId) ?? null;

  if (!mounted) return <div className="h-[60vh]" />;

  return (
    <ModuleGuard moduleId="notes">
      <div className="pb-12">
        <h1 className="text-2xl font-bold mb-5">Shared Notes</h1>

        {collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
            <Bookmark className="size-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Organize your study resources
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Group links to notes, videos, and articles by course or topic
            </p>
            <Button
              onClick={() => setCollectionModalOpen(true)}
              className="gap-1.5 rounded-full"
            >
              <Plus className="size-4" />
              Create your first collection
            </Button>
          </div>
        ) : isDesktop ? (
          <div className="grid grid-cols-[260px_1fr] gap-6 min-h-[60vh]">
            <div className="border-r pr-6">
              <CollectionList
                collections={collections}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onNew={() => setCollectionModalOpen(true)}
              />
            </div>
            <div>
              {selected ? (
                <CollectionDetail
                  collection={selected}
                  onDeleteCollection={() => setConfirmDeleteCollection(selected)}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Select a collection
                </div>
              )}
            </div>
          </div>
        ) : selected ? (
          <CollectionDetail
            collection={selected}
            onDeleteCollection={() => setConfirmDeleteCollection(selected)}
            onBack={() => setSelectedId(null)}
            isMobile
          />
        ) : (
          <CollectionList
            collections={collections}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onNew={() => setCollectionModalOpen(true)}
          />
        )}

        <CollectionModal
          open={collectionModalOpen}
          onOpenChange={setCollectionModalOpen}
        />

        <AlertDialog
          open={!!confirmDeleteCollection}
          onOpenChange={(v) => {
            if (!v) setConfirmDeleteCollection(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete &lsquo;{confirmDeleteCollection?.title}&rsquo;?
              </AlertDialogTitle>
              <AlertDialogDescription>
                All resources in this collection will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmDeleteCollection) {
                    removeCollection(confirmDeleteCollection.id);
                    toast.success("Collection deleted");
                    setSelectedId(null);
                  }
                  setConfirmDeleteCollection(null);
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
