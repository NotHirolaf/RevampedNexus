"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Copy,
  Check,
  Quote,
  Pencil,
  Trash2,
  Save,
  GripVertical,
  X,
  Wand2,
  ListChecks,
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
import { useCitationStore, type Citation } from "@/stores/useCitationStore";
import { cn } from "@/lib/utils";
import {
  formatCitation,
  formatLabel,
  type CitationFields,
  type CitationFormat,
  type CitationSourceType,
} from "@/lib/citations";

const SOURCE_TYPES: { value: CitationSourceType; label: string; emoji: string }[] = [
  { value: "website", label: "Website", emoji: "🌐" },
  { value: "book", label: "Book", emoji: "📕" },
  { value: "journal", label: "Journal", emoji: "📰" },
  { value: "newspaper", label: "Newspaper", emoji: "📃" },
  { value: "video", label: "Video", emoji: "🎥" },
];

const FORMATS: CitationFormat[] = ["apa", "mla", "chicago", "harvard", "ieee"];

function todayDateString(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ─── Author chip ────────────────────────────────────────────────────────

function AuthorChip({
  author,
  onRemove,
  id,
}: {
  author: string;
  onRemove: () => void;
  id: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="inline-flex items-center gap-1 rounded-full border bg-card pl-1 pr-2 py-1 text-xs"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-muted-foreground"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3" />
      </button>
      <span className="font-medium">{author}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove author"
        className="text-muted-foreground hover:text-destructive"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

// ─── Citation form ──────────────────────────────────────────────────────

interface FormState {
  sourceType: CitationSourceType;
  format: CitationFormat;
  authors: string[];
  title: string;
  year: string;
  url: string;
  accessedDate: string;
  publisher: string;
  city: string;
  edition: string;
  isbn: string;
  journal: string;
  volume: string;
  issue: string;
  pages: string;
  doi: string;
  siteName: string;
  newspaper: string;
  platform: string;
  uploader: string;
}

function emptyFormState(): FormState {
  return {
    sourceType: "website",
    format: "apa",
    authors: [],
    title: "",
    year: "",
    url: "",
    accessedDate: todayDateString(),
    publisher: "",
    city: "",
    edition: "",
    isbn: "",
    journal: "",
    volume: "",
    issue: "",
    pages: "",
    doi: "",
    siteName: "",
    newspaper: "",
    platform: "",
    uploader: "",
  };
}

function stateToFields(s: FormState): CitationFields {
  return {
    authors: s.authors.length ? s.authors : undefined,
    title: s.title || undefined,
    year: s.year || undefined,
    url: s.url || undefined,
    accessedDate: s.accessedDate || undefined,
    publisher: s.publisher || undefined,
    city: s.city || undefined,
    edition: s.edition || undefined,
    isbn: s.isbn || undefined,
    journal: s.journal || undefined,
    volume: s.volume || undefined,
    issue: s.issue || undefined,
    pages: s.pages || undefined,
    doi: s.doi || undefined,
    siteName: s.siteName || undefined,
    newspaper: s.newspaper || undefined,
    platform: s.platform || undefined,
    uploader: s.uploader || undefined,
  };
}

function citationToState(c: Citation): FormState {
  const f = c.fields;
  return {
    sourceType: c.sourceType,
    format: c.format,
    authors: f.authors ?? [],
    title: f.title ?? "",
    year: f.year ?? "",
    url: f.url ?? "",
    accessedDate: f.accessedDate ?? "",
    publisher: f.publisher ?? "",
    city: f.city ?? "",
    edition: f.edition ?? "",
    isbn: f.isbn ?? "",
    journal: f.journal ?? "",
    volume: f.volume ?? "",
    issue: f.issue ?? "",
    pages: f.pages ?? "",
    doi: f.doi ?? "",
    siteName: f.siteName ?? "",
    newspaper: f.newspaper ?? "",
    platform: f.platform ?? "",
    uploader: f.uploader ?? "",
  };
}

function CitationForm({
  state,
  setState,
}: {
  state: FormState;
  setState: (s: FormState) => void;
}) {
  const [authorDraft, setAuthorDraft] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function update<K extends keyof FormState>(key: K, val: FormState[K]) {
    setState({ ...state, [key]: val });
  }

  function addAuthor() {
    const a = authorDraft.trim();
    if (!a) return;
    update("authors", [...state.authors, a]);
    setAuthorDraft("");
  }

  function removeAuthor(i: number) {
    update(
      "authors",
      state.authors.filter((_, idx) => idx !== i)
    );
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = state.authors.map((_, i) => String(i));
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    update("authors", arrayMove(state.authors, oldIndex, newIndex));
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Source type
        </Label>
        <div className="grid grid-cols-5 gap-1.5">
          {SOURCE_TYPES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => update("sourceType", s.value)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-xs transition-colors",
                state.sourceType === s.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 hover:bg-muted"
              )}
            >
              <span className="text-base leading-none">{s.emoji}</span>
              <span className="font-medium">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Citation format
        </Label>
        <Select
          value={state.format}
          onValueChange={(v) => update("format", (v as CitationFormat) || "apa")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMATS.map((f) => (
              <SelectItem key={f} value={f}>
                {formatLabel(f)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Authors
        </Label>
        <div className="flex flex-wrap gap-1.5">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={state.authors.map((_, i) => String(i))}
              strategy={verticalListSortingStrategy}
            >
              {state.authors.map((a, i) => (
                <AuthorChip
                  key={`${a}-${i}`}
                  id={String(i)}
                  author={a}
                  onRemove={() => removeAuthor(i)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
        <div className="flex gap-1.5">
          <Input
            placeholder="Last, First"
            value={authorDraft}
            onChange={(e) => setAuthorDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAuthor();
              }
            }}
            className="rounded-xl"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addAuthor}
            disabled={!authorDraft.trim()}
            className="rounded-xl gap-1"
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Format: &ldquo;Last, First&rdquo;. Drag chips to reorder.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label className="text-xs font-medium text-muted-foreground">
            Title
          </Label>
          <Input
            value={state.title}
            onChange={(e) => update("title", e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            Year
          </Label>
          <Input
            value={state.year}
            onChange={(e) => update("year", e.target.value)}
            placeholder="2024"
            className="rounded-xl"
          />
        </div>
      </div>

      {state.sourceType === "website" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs font-medium text-muted-foreground">
              URL
            </Label>
            <Input
              value={state.url}
              onChange={(e) => update("url", e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Site name
            </Label>
            <Input
              value={state.siteName}
              onChange={(e) => update("siteName", e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Accessed date
            </Label>
            <Input
              type="date"
              value={state.accessedDate}
              onChange={(e) => update("accessedDate", e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>
      )}

      {state.sourceType === "book" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Publisher
            </Label>
            <Input
              value={state.publisher}
              onChange={(e) => update("publisher", e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              City
            </Label>
            <Input
              value={state.city}
              onChange={(e) => update("city", e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Edition
            </Label>
            <Input
              value={state.edition}
              onChange={(e) => update("edition", e.target.value)}
              placeholder="2nd"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              ISBN
            </Label>
            <Input
              value={state.isbn}
              onChange={(e) => update("isbn", e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>
      )}

      {state.sourceType === "journal" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Journal name
            </Label>
            <Input
              value={state.journal}
              onChange={(e) => update("journal", e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Volume
            </Label>
            <Input
              value={state.volume}
              onChange={(e) => update("volume", e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Issue
            </Label>
            <Input
              value={state.issue}
              onChange={(e) => update("issue", e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Pages
            </Label>
            <Input
              value={state.pages}
              onChange={(e) => update("pages", e.target.value)}
              placeholder="42–58"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              DOI
            </Label>
            <Input
              value={state.doi}
              onChange={(e) => update("doi", e.target.value)}
              placeholder="10.1234/..."
              className="rounded-xl"
            />
          </div>
        </div>
      )}

      {state.sourceType === "newspaper" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Newspaper name
            </Label>
            <Input
              value={state.newspaper}
              onChange={(e) => update("newspaper", e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              URL
            </Label>
            <Input
              value={state.url}
              onChange={(e) => update("url", e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Pages
            </Label>
            <Input
              value={state.pages}
              onChange={(e) => update("pages", e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>
      )}

      {state.sourceType === "video" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Platform
            </Label>
            <Input
              value={state.platform}
              onChange={(e) => update("platform", e.target.value)}
              placeholder="YouTube"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Uploader / channel
            </Label>
            <Input
              value={state.uploader}
              onChange={(e) => update("uploader", e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs font-medium text-muted-foreground">
              URL
            </Label>
            <Input
              value={state.url}
              onChange={(e) => update("url", e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Batch mode ──────────────────────────────────────────────────────────

function BatchPanel({
  format,
  sourceType,
  onClose,
}: {
  format: CitationFormat;
  sourceType: CitationSourceType;
  onClose: () => void;
}) {
  const addCitation = useCitationStore((s) => s.addCitation);
  const [text, setText] = useState("");

  const DOI_RE = /^10\.\d+\/\S+$/;

  function handleGenerate() {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      toast.error("Paste some DOIs or URLs first");
      return;
    }

    let count = 0;
    for (const line of lines) {
      let fields: CitationFields;
      if (DOI_RE.test(line)) {
        fields = { doi: line };
      } else {
        fields = { url: line };
      }
      const text = formatCitation(format, sourceType, fields);
      addCitation({
        id: crypto.randomUUID(),
        sourceType,
        format,
        fields,
        generatedText: text || (DOI_RE.test(line)
          ? `${line} — fields need manual entry`
          : `${line} — fields need manual entry`),
        createdAt: new Date().toISOString(),
      });
      count++;
    }
    toast.success(`Added ${count} citation${count === 1 ? "" : "s"} to history`);
    setText("");
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-muted-foreground">
          Paste DOIs or URLs, one per line. Each entry is added to history —
          edit individually to fill in metadata.
        </p>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder="https://example.com/article&#10;10.1234/journal.example.123"
        className="font-mono text-xs"
      />
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onClose} className="rounded-full">
          Cancel
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={!text.trim()}
          className="rounded-full gap-1.5"
        >
          <Wand2 className="size-4" />
          Generate All
        </Button>
      </div>
    </div>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────

export function CitationsView() {
  const mounted = useMounted();
  const history = useCitationStore((s) => s.history);
  const addCitation = useCitationStore((s) => s.addCitation);
  const removeCitation = useCitationStore((s) => s.removeCitation);
  const clearHistory = useCitationStore((s) => s.clearHistory);

  const [state, setState] = useState<FormState>(emptyFormState());
  const [batch, setBatch] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const preview = useMemo(
    () => formatCitation(state.format, state.sourceType, stateToFields(state)),
    [state]
  );

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  }

  function handleSave() {
    if (!preview.trim()) {
      toast.error("Fill in some fields first");
      return;
    }
    addCitation({
      id: crypto.randomUUID(),
      sourceType: state.sourceType,
      format: state.format,
      fields: stateToFields(state),
      generatedText: preview,
      createdAt: new Date().toISOString(),
    });
    toast.success("Saved to history");
  }

  function loadFromHistory(c: Citation) {
    setState(citationToState(c));
    setBatch(false);
  }

  if (!mounted) return <div className="h-[60vh]" />;

  return (
    <ModuleGuard moduleId="citations">
      <div className="space-y-6 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Citation Generator</h1>
          <Button
            variant={batch ? "default" : "outline"}
            size="sm"
            onClick={() => setBatch((v) => !v)}
            className="gap-1.5 rounded-full"
          >
            <ListChecks className="size-4" />
            {batch ? "Exit batch mode" : "Batch mode"}
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: form or batch */}
          <div className="rounded-xl border bg-card/80 backdrop-blur-sm p-5">
            {batch ? (
              <BatchPanel
                format={state.format}
                sourceType={state.sourceType}
                onClose={() => setBatch(false)}
              />
            ) : (
              <CitationForm state={state} setState={setState} />
            )}
          </div>

          {/* Right: preview + history */}
          <div className="space-y-5">
            <div className="rounded-xl border bg-card/80 backdrop-blur-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Preview
                </h2>
                <span className="text-[10px] text-muted-foreground">
                  {formatLabel(state.format)}
                </span>
              </div>
              <div className="min-h-[80px] rounded-lg bg-muted/40 p-3 text-sm leading-relaxed">
                {preview ? (
                  preview
                ) : (
                  <span className="text-muted-foreground italic">
                    Start filling in fields to see your citation
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyText(preview)}
                  disabled={!preview}
                  className="gap-1.5 rounded-full flex-1"
                >
                  {copied ? (
                    <>
                      <Check className="size-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!preview}
                  className="gap-1.5 rounded-full flex-1"
                >
                  <Save className="size-4" />
                  Save to history
                </Button>
              </div>
            </div>

            <div className="rounded-xl border bg-card/80 backdrop-blur-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  History
                </h2>
                {history.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmClear(true)}
                    className="text-xs h-7 rounded-full"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Quote className="size-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Generate your first citation
                  </p>
                  <p className="text-xs text-muted-foreground/80 mt-1">
                    Saved citations appear here for quick access
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[40rem] overflow-y-auto pr-1">
                  <AnimatePresence initial={false}>
                    {history.map((c) => {
                      const meta = SOURCE_TYPES.find((s) => s.value === c.sourceType);
                      return (
                        <motion.div
                          key={c.id}
                          layout
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          className="rounded-lg border bg-background/60 p-3 space-y-2"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-base leading-none mt-0.5">
                              {meta?.emoji}
                            </span>
                            <p className="flex-1 text-xs leading-relaxed line-clamp-2">
                              {c.generatedText || (
                                <span className="italic text-muted-foreground">
                                  (empty)
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <span className="rounded-full bg-muted/60 px-1.5 py-0.5 font-medium">
                                {formatLabel(c.format)}
                              </span>
                              <span>·</span>
                              <span>{relativeTime(c.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => copyText(c.generatedText)}
                                aria-label="Copy"
                              >
                                <Copy className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => loadFromHistory(c)}
                                aria-label="Edit"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  removeCitation(c.id);
                                  toast.success("Citation removed");
                                }}
                                aria-label="Delete"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>

        <AlertDialog
          open={confirmClear}
          onOpenChange={setConfirmClear}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear citation history?</AlertDialogTitle>
              <AlertDialogDescription>
                All {history.length} saved citation
                {history.length === 1 ? "" : "s"} will be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  clearHistory();
                  toast.success("History cleared");
                  setConfirmClear(false);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Clear
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ModuleGuard>
  );
}
