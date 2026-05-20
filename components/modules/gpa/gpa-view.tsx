"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModuleGuard } from "@/components/modules/module-guard";
import { useMounted } from "@/hooks/use-hydration";
import { useGPAStore, computeCumulativeGPA } from "@/stores/useGPAStore";
import type { SemesterUpdate } from "@/stores/useGPAStore";
import { useProfileStore } from "@/stores/profile-store";
import { SemesterChart } from "./semester-chart";
import { toast } from "sonner";

// ─── Semester update row ──────────────────────────────────────────────────

function SemesterRow({ update }: { update: SemesterUpdate }) {
  const { updateSemesterUpdate, removeSemesterUpdate, baseCredits, semesterUpdates } = useGPAStore();
  const creditsRequired = useProfileStore((s) => s.creditsRequired);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(update.label);
  const [sGPA, setSGPA] = useState(String(update.sGPA));
  const [credits, setCredits] = useState(String(update.credits));

  function save() {
    const g = parseFloat(sGPA);
    const c = parseFloat(credits);
    if (isNaN(g) || g < 0) { toast.error("Invalid sGPA"); return; }
    if (isNaN(c) || c <= 0) { toast.error("Credits must be positive"); return; }
    if (creditsRequired !== null) {
      const otherCredits = baseCredits + semesterUpdates.filter(u => u.id !== update.id).reduce((s, u) => s + u.credits, 0);
      if (otherCredits + c > creditsRequired) {
        toast.error(`Total credits would exceed max (${creditsRequired})`);
        return;
      }
    }
    updateSemesterUpdate(update.id, { label: label.trim() || update.label, sGPA: g, credits: c });
    setEditing(false);
  }

  function cancel() {
    setLabel(update.label);
    setSGPA(String(update.sGPA));
    setCredits(String(update.credits));
    setEditing(false);
  }

  if (editing) {
    return (
      <tr>
        <td className="py-1.5 pr-2">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-7 text-sm" placeholder="Semester" />
        </td>
        <td className="py-1.5 pr-2 w-24">
          <Input type="number" value={sGPA} onChange={(e) => setSGPA(e.target.value)} min={0} max={4.3} step={0.01} className="h-7 text-sm" />
        </td>
        <td className="py-1.5 pr-2 w-24">
          <Input type="number" value={credits} onChange={(e) => setCredits(e.target.value)} min={0.5} step={0.5} className="h-7 text-sm" />
        </td>
        <td className="py-1.5">
          <div className="flex gap-1">
            <Button size="icon-sm" variant="ghost" onClick={save}><Check className="size-3.5 text-green-500" /></Button>
            <Button size="icon-sm" variant="ghost" onClick={cancel}><X className="size-3.5 text-muted-foreground" /></Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="group hover:bg-muted/30 transition-colors">
      <td className="py-2 pr-2 text-sm">{update.label || "—"}</td>
      <td className="py-2 pr-2 text-sm tabular-nums font-medium">{update.sGPA.toFixed(2)}</td>
      <td className="py-2 pr-2 text-sm tabular-nums text-muted-foreground">{update.credits}</td>
      <td className="py-2">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon-sm" variant="ghost" onClick={() => setEditing(true)}><Pencil className="size-3.5" /></Button>
          <Button size="icon-sm" variant="ghost" onClick={() => { removeSemesterUpdate(update.id); toast.success("Removed"); }}>
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Add semester row form ────────────────────────────────────────────────

function AddSemesterForm({ onDone }: { onDone: () => void }) {
  const { addSemesterUpdate, baseCredits, semesterUpdates } = useGPAStore();
  const defaultSemester = useProfileStore((s) => s.semester);
  const creditsRequired = useProfileStore((s) => s.creditsRequired);
  const [label, setLabel] = useState(defaultSemester);
  const [sGPA, setSGPA] = useState("");
  const [credits, setCredits] = useState("");

  const usedCredits = baseCredits + semesterUpdates.reduce((s, u) => s + u.credits, 0);
  const remainingCredits = creditsRequired !== null ? creditsRequired - usedCredits : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const g = parseFloat(sGPA);
    const c = parseFloat(credits);
    if (isNaN(g) || g < 0) { toast.error("Invalid sGPA"); return; }
    if (isNaN(c) || c <= 0) { toast.error("Credits must be positive"); return; }
    if (creditsRequired !== null && usedCredits + c > creditsRequired) {
      toast.error(`Only ${remainingCredits} credit(s) remaining (max ${creditsRequired})`);
      return;
    }
    addSemesterUpdate({ id: crypto.randomUUID(), label: label.trim(), sGPA: g, credits: c });
    toast.success("Semester added");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-3 border rounded-lg bg-muted/20 space-y-2">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Semester</Label>
          <Input placeholder="e.g. Fall 2025" value={label} onChange={(e) => setLabel(e.target.value)} className="h-8" autoFocus />
        </div>
        <div className="w-24 space-y-1">
          <Label className="text-xs">sGPA</Label>
          <Input type="number" placeholder="3.50" value={sGPA} onChange={(e) => setSGPA(e.target.value)} min={0} max={4.3} step={0.01} className="h-8" />
        </div>
        <div className="w-24 space-y-1">
          <Label className="text-xs">
            Credits
            {remainingCredits !== null && (
              <span className="ml-1 text-muted-foreground font-normal">
                (max {remainingCredits})
              </span>
            )}
          </Label>
          <Input
            type="number"
            placeholder="15"
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            min={0.5}
            max={remainingCredits ?? undefined}
            step={0.5}
            className="h-8"
          />
        </div>
        <Button type="submit" size="sm">Add</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────

export function GpaView() {
  const mounted = useMounted();
  const { semesterUpdates } = useGPAStore();
  const gpaScale = useProfileStore((s) => s.gpaScale);
  const customGpaMax = useProfileStore((s) => s.customGpaMax);
  const creditsRequired = useProfileStore((s) => s.creditsRequired);

  const [addingRow, setAddingRow] = useState(false);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  // Derived cGPA purely from semester entries (no base)
  const manualResult = computeCumulativeGPA(null, 0, semesterUpdates);
  const displayCGPA = manualResult?.cgpa ?? null;

  const maxGpa = gpaScale === "percentage" ? 100 : gpaScale === "4.3" ? 4.3 : gpaScale === "custom" ? (customGpaMax ?? 4.0) : 4.0;

  // Chart data from semester updates
  const chartData = semesterUpdates.map((u) => ({ label: u.label || "Semester", gpa: u.sGPA, maxGpa }));

  return (
    <ModuleGuard moduleId="gpa">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">GPA Calculator</h1>

        {/* cGPA display */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Cumulative GPA
            </p>
            <div className="flex items-end gap-2">
              <p className="text-5xl font-bold tabular-nums leading-none">
                {displayCGPA !== null ? displayCGPA.toFixed(2) : "—"}
              </p>
              <p className="text-lg text-muted-foreground pb-0.5">/ {maxGpa}</p>
            </div>
            {manualResult && (
              <p className="text-xs text-muted-foreground mt-1">
                Based on {manualResult.totalCredits}
                {creditsRequired !== null ? ` / ${creditsRequired}` : ""} total credits
              </p>
            )}
          </CardContent>
        </Card>

        {/* Semester entries */}
        <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Semester Updates</CardTitle>
                  {!addingRow && (
                    <Button size="sm" variant="outline" className="gap-1.5 h-7" onClick={() => setAddingRow(true)}>
                      <Plus className="size-3.5" />
                      Add Semester
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {semesterUpdates.length === 0 && !addingRow ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No semesters added yet. Add a semester sGPA to update your cGPA.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      {semesterUpdates.length > 0 && (
                        <thead>
                          <tr className="text-xs text-muted-foreground border-b">
                            <th className="text-left pb-1.5 pr-2 font-normal">Semester</th>
                            <th className="text-left pb-1.5 pr-2 font-normal w-24">sGPA</th>
                            <th className="text-left pb-1.5 pr-2 font-normal w-24">Credits</th>
                            <th className="pb-1.5 w-16" />
                          </tr>
                        </thead>
                      )}
                      <tbody>
                        {semesterUpdates.map((u) => (
                          <SemesterRow key={u.id} update={u} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {addingRow && <AddSemesterForm onDone={() => setAddingRow(false)} />}
              </CardContent>
            </Card>
        {/* Semester chart */}
        {chartData.length > 0 && <SemesterChart semesters={chartData} />}
      </div>
    </ModuleGuard>
  );
}
