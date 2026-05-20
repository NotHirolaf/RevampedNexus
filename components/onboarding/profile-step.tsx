"use client";

import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfileStore } from "@/stores/profile-store";
import type { GpaScale } from "@/types";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface ProfileStepProps {
  onNext: () => void;
  onBack: () => void;
}

const YEARS = [
  { key: "1", label: "Y1" },
  { key: "2", label: "Y2" },
  { key: "3", label: "Y3" },
  { key: "4", label: "Y4" },
  { key: "5", label: "Y5+" },
  { key: "grad", label: "Grad" },
];

const GPA_SCALES: { value: GpaScale; label: string }[] = [
  { value: "4.0", label: "4.0" },
  { value: "4.3", label: "4.3" },
  { value: "percentage", label: "%" },
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

function formatCredits(val: number | null): string {
  if (val === null) return "";
  return Number.isInteger(val) ? `${val}.0` : String(val);
}

export function ProfileStep({ onNext, onBack }: ProfileStepProps) {
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

  const chipBase = "px-3 py-1.5 rounded-full text-sm font-medium transition-all";
  const chipActive = "bg-primary text-primary-foreground shadow-sm";
  const chipIdle = "bg-muted/60 dark:bg-muted/30 text-foreground hover:bg-muted";

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="flex flex-col items-center text-center gap-2"
      >
        <div className="flex items-center justify-center size-12 rounded-2xl bg-primary/10 dark:bg-primary/20 mb-1">
          <User className="size-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Quick profile setup</h2>
        <p className="text-sm text-muted-foreground">
          All fields are optional. You can update these later.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="space-y-5"
      >
        {/* Name & university */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="displayName" className="text-xs text-muted-foreground font-medium">Display name</Label>
            <Input
              id="displayName"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => updateProfile({ displayName: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="university" className="text-xs text-muted-foreground font-medium">University</Label>
            <Input
              id="university"
              placeholder="University name"
              value={university}
              onChange={(e) => updateProfile({ university: e.target.value })}
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Year picker */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground font-medium">Current year</Label>
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
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.2 }}
              className="flex gap-1.5 pt-0.5"
            >
              {["1", "2"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => selectSem(s)}
                  className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all", sem === s ? chipActive : chipIdle)}
                >
                  Semester {s}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Credits */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground font-medium">Credits</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground">Obtained</span>
              <Input
                id="creditsObtained"
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
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground">Required</span>
              <Input
                id="creditsRequired"
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
                className="rounded-xl"
              />
            </div>
          </div>

          {creditsPct !== null && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-1.5 pt-1"
            >
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {formatCredits(creditsObtained)} / {formatCredits(creditsRequired)}
                </span>
                <span className="font-medium text-primary">{Math.round(creditsPct)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${creditsPct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* GPA scale */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground font-medium">GPA scale</Label>
          <div className="flex gap-1.5">
            {GPA_SCALES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateProfile({ gpaScale: value })}
                className={cn(
                  "flex-1 py-2 rounded-full text-sm font-medium transition-all text-center",
                  gpaScale === value ? chipActive : chipIdle
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {gpaScale === "custom" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.2 }}
              className="pt-1"
            >
              <Input
                id="customGpa"
                type="number"
                placeholder="Max GPA (e.g. 5.0)"
                step={0.1}
                value={customGpaMax ?? ""}
                onChange={(e) =>
                  updateProfile({
                    customGpaMax: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="w-40 rounded-xl"
              />
            </motion.div>
          )}
        </div>
      </motion.div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack} className="rounded-full">
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onNext} className="rounded-full">
            Skip
          </Button>
          <Button onClick={onNext} className="rounded-full px-6">
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
