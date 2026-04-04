"use client";

import { LayoutDashboard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function AboutSection() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center text-center gap-4 py-8">
        <div className="flex items-center justify-center size-14 rounded-2xl bg-primary text-primary-foreground">
          <LayoutDashboard className="size-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Nexus</h2>
          <p className="text-sm text-muted-foreground">Version 1.0.0</p>
        </div>
        <Separator className="max-w-xs" />
        <p className="text-sm text-muted-foreground">
          Built for students, by students.
        </p>
      </CardContent>
    </Card>
  );
}
