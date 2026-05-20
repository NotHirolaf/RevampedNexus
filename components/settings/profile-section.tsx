"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfileStore } from "@/stores/profile-store";
import type { GpaScale } from "@/types";
import { cn } from "@/lib/utils";

const YEARS = [
  { key: "1", label: "Y1" },
  { key: "2", label: "Y2" },
  { key: "3", label: "Y3" },
  { key: "4", label: "Y4" },
  { key: "5", label: "Y5+" },
  { key: "grad", label: "Grad" },
];

const GPA_SCALES: { value: GpaScale; label: string }[] = [
  { value: "4.0", label: "4.0 Scale" },
  { value: "4.3", label: "4.3 Scale" },
  { value: "percentage", label: "Percentage" },
  { value: "custom", label: "Custom" },
];

function parseSemester(value: string): { year: string; sem: string } {
  if (value === "Year 5+") return { year: "5", sem: "" };
  if (value === "Graduate") return { year: "grad", sem: "" };
  const match = value.match(/Year (\d) — Semester (\d)/);
  if (match) return { year: match[1], sem: match[2] };
  return { year: "", sem: "" };
}

function composeSemester(year: string, sem: string): string {
  if (year === "5") return "Year 5+";
  if (year === "grad") return "Graduate";
  if (year && sem) return `Year ${year} — Semester ${sem}`;
  return "";
}

const chipBase = "px-3 py-1.5 rounded-lg text-sm font-medium transition-all";
const chipActive = "bg-primary text-primary-foreground shadow-sm";
const chipIdle = "bg-muted hover:bg-muted/70 border border-border text-foreground";

function formatCredits(val: number | null): string {
  if (val === null) return "";
  return Number.isInteger(val) ? `${val}.0` : String(val);
}

export function ProfileSection() {
  const {
    displayName,
    university,
    semester,
    gpaScale,
    customGpaMax,
    creditsObtained,
    creditsRequired,
    updateProfile,
  } = useProfileStore();

  const { year, sem } = parseSemester(semester);
  const showSemester = ["1", "2", "3", "4"].includes(year);

  const creditsPct =
    creditsObtained !== null && creditsRequired !== null && creditsRequired > 0
      ? Math.min(100, (creditsObtained / creditsRequired) * 100)
      : null;

  function selectYear(key: string) {
    if (year === key) { updateProfile({ semester: "" }); return; }
    const needsSem = !["5", "grad"].includes(key);
    updateProfile({ semester: composeSemester(key, needsSem ? (sem || "1") : "") });
  }

  function selectSem(s: string) {
    updateProfile({ semester: composeSemester(year, s) });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Name & university */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="settings-name">Display name</Label>
            <Input
              id="settings-name"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => updateProfile({ displayName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-university">University</Label>
            <Input
              id="settings-university"
              placeholder="University name"
              value={university}
              onChange={(e) => updateProfile({ university: e.target.value })}
            />
          </div>
        </div>

        {/* Year / semester */}
        <div className="space-y-2">
          <Label>Current year &amp; semester</Label>
          <div className="flex gap-1.5 flex-wrap">
            {YEARS.map((y) => (
              <button
                key={y.key}
                type="button"
                onClick={() => selectYear(y.key)}
                className={cn(chipBase, year === y.key ? chipActive : chipIdle)}
              >
                {y.label}
              </button>
            ))}
          </div>
          {showSemester && (
            <div className="flex gap-1.5 pt-1">
              {["1", "2"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => selectSem(s)}
                  className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", sem === s ? chipActive : chipIdle)}
                >
                  Semester {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Credits */}
        <div className="space-y-2">
          <Label>Credits</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Obtained</span>
              <Input
                id="settings-credits-obtained"
                type="number"
                placeholder="e.g. 60.0"
                min={0}
                step={0.5}
                value={formatCredits(creditsObtained)}
                onChange={(e) =>
                  updateProfile({
                    creditsObtained: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Required</span>
              <Input
                id="settings-credits-required"
                type="number"
                placeholder="e.g. 120.0"
                min={0}
                step={0.5}
                value={formatCredits(creditsRequired)}
                onChange={(e) =>
                  updateProfile({
                    creditsRequired: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
              />
            </div>
          </div>

          {creditsPct !== null && (
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {formatCredits(creditsObtained)} / {formatCredits(creditsRequired)} credits completed
                </span>
                <span className="font-medium text-primary">{Math.round(creditsPct)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${creditsPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* GPA scale */}
        <div className="space-y-2">
          <Label>GPA scale</Label>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {GPA_SCALES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateProfile({ gpaScale: value })}
                className={cn(
                  "py-2 px-3 rounded-lg text-sm font-medium transition-all text-center",
                  gpaScale === value ? chipActive : chipIdle
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {gpaScale === "custom" && (
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="settings-custom-gpa" className="text-sm">Maximum GPA value</Label>
              <Input
                id="settings-custom-gpa"
                type="number"
                placeholder="e.g. 5.0"
                step={0.1}
                value={customGpaMax ?? ""}
                onChange={(e) =>
                  updateProfile({
                    customGpaMax: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="w-32"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
