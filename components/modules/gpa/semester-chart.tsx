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

const CHART_H = 80;
const BAR_W = 32;
const MIN_GAP = 12;
const PADDING_X = 8;
const PADDING_TOP = 18; // space for GPA label above bar
const LABEL_FONT_PX = 10;
const LABEL_CHAR_W = 5.6; // approx width per char at fontSize 10
const LABEL_H = 16; // reserved height below baseline

export function SemesterChart({ semesters: rawSemesters }: SemesterChartProps) {
  const semesters = [...rawSemesters].sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  // Column width: at least BAR_W + MIN_GAP, but grow to fit the longest label
  const longestLabelChars = semesters.reduce(
    (m, s) => Math.max(m, (s.label || "").length),
    0
  );
  const labelWidthPx = longestLabelChars * LABEL_CHAR_W;
  const colWidth = Math.max(BAR_W + MIN_GAP, labelWidthPx + 8);

  const svgWidth = semesters.length * colWidth + PADDING_X * 2;
  const svgHeight = CHART_H + PADDING_TOP + LABEL_H + 8;

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
            <svg width={svgWidth} height={svgHeight}>
              {semesters.map((sem, i) => {
                const maxGpa = sem.maxGpa > 0 ? sem.maxGpa : 4.0;
                const barH = Math.max(2, (sem.gpa / maxGpa) * CHART_H);
                const colCenter = PADDING_X + i * colWidth + colWidth / 2;
                const x = colCenter - BAR_W / 2;
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
                      x={colCenter}
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
                      x={colCenter}
                      y={PADDING_TOP + CHART_H + LABEL_H}
                      textAnchor="middle"
                      fontSize={LABEL_FONT_PX}
                      fill="currentColor"
                      opacity={0.7}
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
                x2={svgWidth - PADDING_X}
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
