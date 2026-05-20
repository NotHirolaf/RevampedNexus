"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WidgetCardProps {
  title: string;
  icon: LucideIcon;
  href?: string;
  className?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function WidgetCard({
  title,
  icon: Icon,
  href,
  className,
  action,
  children,
}: WidgetCardProps) {
  const card = (
    <Card
      className={cn(
        "h-full transition-colors",
        href && "hover:bg-accent/50 cursor-pointer",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-7 rounded-lg bg-primary/10">
            <Icon className="size-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{card}</Link>;
  }

  return card;
}
