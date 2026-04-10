"use client";

import { useState } from "react";
import { ChevronDown, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function FinalExamCalculator() {
  const [open, setOpen] = useState(false);
  const [currentGrade, setCurrentGrade] = useState(80);
  const [finalWeight, setFinalWeight] = useState(30);
  const [targetGrade, setTargetGrade] = useState(85);

  // Formula: needed = (target - currentGrade * (1 - finalWeight/100)) / (finalWeight/100)
  const needed =
    finalWeight > 0
      ? (targetGrade - currentGrade * (1 - finalWeight / 100)) /
        (finalWeight / 100)
      : null;

  function resultContent() {
    if (needed === null) {
      return (
        <p className="text-sm text-muted-foreground">
          Final exam weight must be greater than 0%.
        </p>
      );
    }
    if (needed <= 0) {
      return (
        <p className="text-sm text-green-600 dark:text-green-400">
          You&apos;ve already achieved a {targetGrade}%! No minimum score needed
          on the final.
        </p>
      );
    }
    if (needed > 120) {
      return (
        <p className="text-sm text-destructive">
          Not achievable — you would need{" "}
          <strong>{needed.toFixed(1)}%</strong>, which exceeds 100%. Consider
          lowering your target grade.
        </p>
      );
    }
    if (needed > 100) {
      return (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Very challenging — you need{" "}
          <strong>{needed.toFixed(1)}%</strong> on the final to achieve a{" "}
          {targetGrade}%. This exceeds 100% and may not be achievable.
        </p>
      );
    }
    return (
      <p className="text-sm">
        You need at least{" "}
        <strong className="text-foreground text-base">
          {needed.toFixed(1)}%
        </strong>{" "}
        on the final exam to achieve a{" "}
        <strong>{targetGrade}%</strong> overall.
      </p>
    );
  }

  return (
    <div>
      <Separator className="mb-4" />
      <Card>
        <CardHeader className="pb-2">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center justify-between w-full text-left"
            aria-expanded={open}
          >
            <CardTitle className="text-sm flex items-center gap-2">
              <Calculator className="size-4 text-muted-foreground" />
              Final Exam Calculator
            </CardTitle>
            <ChevronDown
              className={`size-4 text-muted-foreground transition-transform duration-150 ${
                open ? "" : "-rotate-90"
              }`}
            />
          </button>
        </CardHeader>

        {open && (
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Calculate the minimum score you need on your final exam to achieve
              a target overall grade.
            </p>

            <div className="space-y-3">
              {/* Current grade */}
              <div className="space-y-1.5">
                <Label className="text-sm">Current grade (before final)</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={currentGrade}
                    onChange={(e) => setCurrentGrade(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <Input
                    type="number"
                    value={currentGrade}
                    onChange={(e) =>
                      setCurrentGrade(
                        Math.max(0, Math.min(100, Number(e.target.value)))
                      )
                    }
                    min={0}
                    max={100}
                    className="w-16 h-7 text-sm"
                  />
                  <span className="text-sm text-muted-foreground w-4">%</span>
                </div>
              </div>

              {/* Final exam weight */}
              <div className="space-y-1.5">
                <Label className="text-sm">Final exam weight</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={finalWeight}
                    onChange={(e) => setFinalWeight(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <Input
                    type="number"
                    value={finalWeight}
                    onChange={(e) =>
                      setFinalWeight(
                        Math.max(1, Math.min(100, Number(e.target.value)))
                      )
                    }
                    min={1}
                    max={100}
                    className="w-16 h-7 text-sm"
                  />
                  <span className="text-sm text-muted-foreground w-4">%</span>
                </div>
              </div>

              {/* Target grade */}
              <div className="space-y-1.5">
                <Label className="text-sm">Target overall grade</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={50}
                    max={100}
                    value={targetGrade}
                    onChange={(e) => setTargetGrade(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <Input
                    type="number"
                    value={targetGrade}
                    onChange={(e) =>
                      setTargetGrade(
                        Math.max(50, Math.min(100, Number(e.target.value)))
                      )
                    }
                    min={50}
                    max={100}
                    className="w-16 h-7 text-sm"
                  />
                  <span className="text-sm text-muted-foreground w-4">%</span>
                </div>
              </div>
            </div>

            {/* Result */}
            <div className="rounded-lg p-3 bg-muted/50">
              {resultContent()}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
