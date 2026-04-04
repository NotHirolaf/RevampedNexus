"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfileStore } from "@/stores/profile-store";
import type { GpaScale } from "@/types";

const semesters = [
  "Year 1 — Semester 1",
  "Year 1 — Semester 2",
  "Year 2 — Semester 1",
  "Year 2 — Semester 2",
  "Year 3 — Semester 1",
  "Year 3 — Semester 2",
  "Year 4 — Semester 1",
  "Year 4 — Semester 2",
  "Year 5+",
  "Graduate",
];

export function ProfileSection() {
  const { displayName, university, semester, gpaScale, customGpaMax, updateProfile } =
    useProfileStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div className="space-y-2">
          <Label htmlFor="settings-semester">Current semester</Label>
          <Select
            value={semester}
            onValueChange={(val) => updateProfile({ semester: val ?? "" })}
          >
            <SelectTrigger id="settings-semester">
              <SelectValue placeholder="Select semester" />
            </SelectTrigger>
            <SelectContent>
              {semesters.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>GPA scale</Label>
          <RadioGroup
            value={gpaScale}
            onValueChange={(val) => updateProfile({ gpaScale: val as GpaScale })}
            className="grid grid-cols-2 gap-2"
          >
            {(["4.0", "4.3", "percentage", "custom"] as GpaScale[]).map((scale) => (
              <div key={scale} className="flex items-center space-x-2">
                <RadioGroupItem value={scale} id={`settings-gpa-${scale}`} />
                <Label htmlFor={`settings-gpa-${scale}`} className="font-normal cursor-pointer">
                  {scale === "4.0"
                    ? "4.0 Scale"
                    : scale === "4.3"
                      ? "4.3 Scale"
                      : scale === "percentage"
                        ? "Percentage (100%)"
                        : "Custom"}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {gpaScale === "custom" && (
            <div className="space-y-2 pl-6">
              <Label htmlFor="settings-custom-gpa">Maximum GPA value</Label>
              <Input
                id="settings-custom-gpa"
                type="number"
                placeholder="e.g. 5.0"
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
