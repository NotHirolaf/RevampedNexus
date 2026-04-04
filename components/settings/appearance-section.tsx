"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores/theme-store";
import type { AccentColor } from "@/types";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

const ACCENT_COLORS: { value: AccentColor; label: string; bg: string }[] = [
  { value: "blue", label: "Blue", bg: "bg-blue-500" },
  { value: "purple", label: "Purple", bg: "bg-purple-500" },
  { value: "green", label: "Green", bg: "bg-green-500" },
  { value: "orange", label: "Orange", bg: "bg-orange-500" },
  { value: "pink", label: "Pink", bg: "bg-pink-500" },
  { value: "teal", label: "Teal", bg: "bg-teal-500" },
  { value: "red", label: "Red", bg: "bg-red-500" },
  { value: "amber", label: "Amber", bg: "bg-amber-500" },
];

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const { accentColor, setAccentColor } = useThemeStore();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <Button
                  key={opt.value}
                  variant={theme === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme(opt.value)}
                  className="gap-2"
                  aria-label={`${opt.label} mode`}
                >
                  <Icon className="size-4" />
                  {opt.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accent color</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => setAccentColor(color.value)}
                className={cn(
                  "relative size-10 rounded-full transition-all",
                  color.bg,
                  accentColor === color.value
                    ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                    : "hover:scale-105"
                )}
                aria-label={`${color.label} accent color`}
                title={color.label}
              >
                {accentColor === color.value && (
                  <Check className="size-4 text-white absolute inset-0 m-auto" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
