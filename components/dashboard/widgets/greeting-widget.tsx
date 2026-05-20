"use client";

import { Sun, Sunset, CloudMoon } from "lucide-react";
import { useRealtimeClock } from "@/hooks/useRealtimeClock";
import { useProfileStore } from "@/stores/profile-store";
import { Card, CardContent } from "@/components/ui/card";

function getGreeting(hour: number) {
  if (hour >= 5 && hour < 12) return { text: "Good morning", icon: Sun };
  if (hour >= 12 && hour < 17) return { text: "Good afternoon", icon: Sun };
  if (hour >= 17 && hour < 21) return { text: "Good evening", icon: Sunset };
  return { text: "Good night", icon: CloudMoon };
}

export function GreetingWidget() {
  const now = useRealtimeClock();
  const displayName = useProfileStore((s) => s.displayName);

  const hour = now.getHours();
  const { text, icon: Icon } = getGreeting(hour);

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const greeting = displayName ? `${text}, ${displayName}` : `${text}!`;

  return (
    <Card className="md:col-span-2">
      <CardContent className="py-5">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 shrink-0">
            <Icon className="size-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold">{greeting}</h2>
            <p className="text-sm text-muted-foreground">{dateStr}</p>
          </div>
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-2xl font-mono font-semibold tabular-nums">
              {timeStr}
            </p>
          </div>
        </div>
        <div className="mt-2 sm:hidden">
          <p className="text-xl font-mono font-semibold tabular-nums text-center">
            {timeStr}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
