"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, Calculator, AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ModuleGuard } from "@/components/modules/module-guard";
import { useMounted } from "@/hooks/use-hydration";
import {
  useGpaReferenceStore,
  lookupByPercentage,
  entriesOverlap,
} from "@/stores/useGpaReferenceStore";

export function GpaReferenceView() {
  const mounted = useMounted();
  const entries = useGpaReferenceStore((s) => s.entries);
  const addEntry = useGpaReferenceStore((s) => s.addEntry);
  const updateEntry = useGpaReferenceStore((s) => s.updateEntry);
  const removeEntry = useGpaReferenceStore((s) => s.removeEntry);
  const resetEntries = useGpaReferenceStore((s) => s.resetEntries);

  const sortedEntries = useMemo(
    () =>
      [...entries]
        .map((e, i) => ({ e, i }))
        .sort((x, y) => y.e.maxPercentage - x.e.maxPercentage),
    [entries]
  );

  const [pctInput, setPctInput] = useState("");
  const lookup = useMemo(() => {
    const pct = parseFloat(pctInput);
    if (isNaN(pct)) return null;
    return lookupByPercentage(entries, Math.max(0, Math.min(100, pct)));
  }, [pctInput, entries]);

  const hasOverlap = entriesOverlap(entries);

  if (!mounted) return <div className="h-[60vh]" />;

  return (
    <ModuleGuard moduleId="gpa-reference">
      <div className="space-y-6 pb-12">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">GPA Reference</h1>
        </div>

        {/* Quick Lookup */}
        <div className="rounded-xl border bg-card/80 backdrop-blur-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
              <Calculator className="size-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold">Quick Lookup</h2>
          </div>
          <div className="grid sm:grid-cols-[200px_1fr] gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Percentage
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.1"
                placeholder="e.g. 87"
                value={pctInput}
                onChange={(e) => setPctInput(e.target.value)}
                className="rounded-xl text-lg font-medium"
              />
            </div>
            <div className="rounded-xl bg-muted/40 p-4 min-h-[64px] flex items-center">
              {pctInput.trim() === "" ? (
                <span className="text-sm text-muted-foreground italic">
                  Type a percentage to see the grade
                </span>
              ) : lookup ? (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {lookup.letter && (
                    <span className="text-2xl font-bold text-primary">
                      {lookup.letter}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {lookup.gpaPoints.toFixed(lookup.gpaPoints % 1 === 0 ? 1 : 2)}{" "}
                    GPA
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({lookup.minPercentage}–{lookup.maxPercentage}%)
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  No match in this scale
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Grade table */}
        <div className="rounded-xl border bg-card/80 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-sm font-semibold">Grade Scale</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-full"
                onClick={() => {
                  if (confirm("Clear all rows?")) resetEntries();
                }}
              >
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  addEntry({
                    letter: "",
                    minPercentage: 0,
                    maxPercentage: 0,
                    gpaPoints: 0,
                  })
                }
                className="gap-1.5 rounded-full"
              >
                <Plus className="size-3.5" />
                Add row
              </Button>
            </div>
          </div>

          {hasOverlap && (
            <div className="flex items-start gap-2 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
              <span>
                Some percentage ranges overlap. Lookup may be ambiguous.
              </span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Letter</th>
                  <th className="px-4 py-2 text-left font-medium">
                    Percentage range
                  </th>
                  <th className="px-4 py-2 text-left font-medium">Points</th>
                  <th className="px-4 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {sortedEntries.map(({ e, i }) => (
                    <motion.tr
                      key={i}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b last:border-b-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-2.5">
                        <Input
                          value={e.letter}
                          onChange={(ev) =>
                            updateEntry(i, { letter: ev.target.value })
                          }
                          className="h-8 w-20 rounded-md"
                          placeholder="A+"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            value={e.minPercentage}
                            onChange={(ev) =>
                              updateEntry(i, {
                                minPercentage: Number(ev.target.value),
                              })
                            }
                            className="h-8 w-16 rounded-md"
                            min={0}
                            max={100}
                          />
                          <span className="text-muted-foreground">–</span>
                          <Input
                            type="number"
                            value={e.maxPercentage}
                            onChange={(ev) =>
                              updateEntry(i, {
                                maxPercentage: Number(ev.target.value),
                              })
                            }
                            className="h-8 w-16 rounded-md"
                            min={0}
                            max={100}
                          />
                          <span className="text-muted-foreground text-xs">%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Input
                          type="number"
                          step="0.1"
                          value={e.gpaPoints}
                          onChange={(ev) =>
                            updateEntry(i, {
                              gpaPoints: Number(ev.target.value),
                            })
                          }
                          className="h-8 w-20 rounded-md"
                          min={0}
                        />
                      </td>
                      <td className="px-2 py-2.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeEntry(i)}
                          aria-label="Remove row"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-4" />
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ModuleGuard>
  );
}
