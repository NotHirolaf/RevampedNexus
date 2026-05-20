"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/layout/logo";

export function AboutSection() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center text-center gap-4 py-8">
        <Logo variant="mark" className="!size-20" />
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
