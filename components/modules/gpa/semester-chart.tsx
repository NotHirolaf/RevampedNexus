"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2 } from "lucide-react";

interface SemesterData {
  label: string;
  gpa: number;
  maxGpa: number;
}

interface SemesterChartProps {
  semesters: SemesterData[];
}

const CHART_H = 100;
const BAR_W = 40;
const GAP = 16;
const PADDING_X = 8;
const PADDING_TOP = 20; // space for GPA label above bar

export function SemesterChart({ semesters: rawSemesters }: SemesterChartProps) {
  const semesters = [...rawSemesters].sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart2 className="size-4 text-muted-foreground" />
          GPA by Semester
        </CardTitle>
      </CardHeader>
      <CardContent>
        {semesters.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
            No semester data yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${
                semesters.length * (BAR_W + GAP) - GAP + PADDING_X * 2
              } ${CHART_H + PADDING_TOP + 24}`}
              className="w-full"
              style={{
                minWidth: semesters.length * (BAR_W + GAP) - GAP + PADDING_X * 2,
              }}
            >
              {semesters.map((sem, i) => {
                const maxGpa = sem.maxGpa > 0 ? sem.maxGpa : 4.0;
                const barH = Math.max(2, (sem.gpa / maxGpa) * CHART_H);
                const x = PADDING_X + i * (BAR_W + GAP);
                const y = PADDING_TOP + (CHART_H - barH);

                return (
                  <g key={sem.label}>
                    {/* Bar */}
                    <rect
                      x={x}
                      y={y}
                      width={BAR_W}
                      height={barH}
                      fill="hsl(var(--primary))"
                      opacity={0.85}
                      rx={4}
                    />
                    {/* GPA label above bar */}
                    <text
                      x={x + BAR_W / 2}
                      y={y - 5}
                      textAnchor="middle"
                      fontSize={11}
                      fill="currentColor"
                      className="font-medium"
                    >
                      {sem.gpa.toFixed(2)}
                    </text>
                    {/* Semester label below */}
                    <text
                      x={x + BAR_W / 2}
                      y={PADDING_TOP + CHART_H + 16}
                      textAnchor="middle"
                      fontSize={10}
                      fill="currentColor"
                      opacity={0.6}
                    >
                      {sem.label}
                    </text>
                  </g>
                );
              })}

              {/* Baseline */}
              <line
                x1={PADDING_X}
                y1={PADDING_TOP + CHART_H}
                x2={
                  semesters.length * (BAR_W + GAP) -
                  GAP +
                  PADDING_X
                }
                y2={PADDING_TOP + CHART_H}
                stroke="currentColor"
                opacity={0.15}
                strokeWidth={1}
              />
            </svg>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
