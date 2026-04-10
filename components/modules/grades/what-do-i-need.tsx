"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCategoryAverage } from "@/lib/grade-utils";
import type { Course } from "@/types";

interface WhatDoINeedProps {
  course: Course;
}

export function WhatDoINeed({ course }: WhatDoINeedProps) {
  const [target, setTarget] = useState(80);

  // Compute completed vs remaining work
  let completedWeightedScore = 0;
  let completedWeight = 0;
  let remainingWeight = 0;

  for (const cat of course.categories) {
    if (cat.weight === 0) continue;
    const avg = getCategoryAverage(cat);
    if (avg !== null) {
      completedWeightedScore += avg * (cat.weight / 100);
      completedWeight += cat.weight;
    } else {
      remainingWeight += cat.weight;
    }
  }

  const totalWeight = completedWeight + remainingWeight;

  function getResult() {
    if (totalWeight === 0) return { type: "no-categories" as const };
    if (remainingWeight === 0) return { type: "all-graded" as const, current: completedWeightedScore };

    // needed = (target/100 - completedWeightedScore) / (remainingWeight/100)
    const needed =
      ((target / 100 - completedWeightedScore) / (remainingWeight / 100)) * 100;

    return { type: "needed" as const, needed };
  }

  const result = getResult();

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <HelpCircle className="size-4 text-muted-foreground" />
          What Do I Need?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {result.type === "no-categories" ? (
          <p className="text-sm text-muted-foreground">
            Add categories to use this calculator.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Label className="text-sm whitespace-nowrap">Target grade</Label>
              <input
                type="range"
                min={0}
                max={100}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <Input
                type="number"
                value={target}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(100, Number(e.target.value)));
                  setTarget(v);
                }}
                min={0}
                max={100}
                className="w-16 h-7 text-sm"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>

            <div className="rounded-lg p-3 bg-muted/50 text-sm">
              {result.type === "all-graded" ? (
                <p>
                  All work is graded. Your current grade is{" "}
                  <strong>{result.current.toFixed(1)}%</strong>.
                </p>
              ) : result.needed <= 0 ? (
                <p className="text-green-600 dark:text-green-400">
                  You&apos;ve already achieved a {target}%! Your current work
                  puts you above this target.
                </p>
              ) : result.needed > 100 ? (
                <p className="text-amber-600 dark:text-amber-400">
                  You would need{" "}
                  <strong>{result.needed.toFixed(1)}%</strong> on remaining
                  work — this target may not be achievable. Try lowering your
                  goal.
                </p>
              ) : (
                <p>
                  You need at least{" "}
                  <strong className="text-foreground">
                    {result.needed.toFixed(1)}%
                  </strong>{" "}
                  on remaining work (
                  {remainingWeight}% of your grade) to achieve a{" "}
                  <strong>{target}%</strong> overall.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
