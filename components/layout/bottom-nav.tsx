"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, LayoutDashboard } from "lucide-react";
import { useModuleStore } from "@/stores/module-store";
import { modules } from "@/lib/modules";
import { useMounted } from "@/hooks/use-hydration";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const enabledModules = useModuleStore((s) => s.enabledModules);
  const mounted = useMounted();

  if (!mounted) return null;

  const enabledModuleConfigs = modules.filter((m) => enabledModules[m.id]);
  const visibleModules = enabledModuleConfigs.slice(0, 4);
  const overflowModules = enabledModuleConfigs.slice(4);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {/* Dashboard always first */}
        <Link
          href="/dashboard"
          className={cn(
            "flex flex-col items-center justify-center gap-1 flex-1 h-full text-muted-foreground transition-colors",
            pathname === "/dashboard" && "text-primary"
          )}
          aria-label="Dashboard"
          aria-current={pathname === "/dashboard" ? "page" : undefined}
        >
          <LayoutDashboard className="size-5" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </Link>

        {/* Top 4 enabled modules */}
        {visibleModules.map((mod) => (
          <Link
            key={mod.id}
            href={mod.route}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 h-full text-muted-foreground transition-colors",
              pathname === mod.route && "text-primary"
            )}
            aria-label={mod.name}
            aria-current={pathname === mod.route ? "page" : undefined}
          >
            <mod.icon className="size-5" />
            <span className="text-[10px] font-medium truncate max-w-[60px]">
              {mod.name}
            </span>
          </Link>
        ))}

        {/* More overflow */}
        {overflowModules.length > 0 && (
          <Sheet>
            <SheetTrigger
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-muted-foreground transition-colors"
              aria-label="More modules"
            >
              <MoreHorizontal className="size-5" />
              <span className="text-[10px] font-medium">More</span>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl">
              <SheetHeader>
                <SheetTitle>All Modules</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-4 gap-4 py-4">
                {enabledModuleConfigs.map((mod) => (
                  <Link
                    key={mod.id}
                    href={mod.route}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl text-muted-foreground transition-colors hover:bg-accent",
                      pathname === mod.route && "text-primary bg-accent"
                    )}
                  >
                    <mod.icon className="size-6" />
                    <span className="text-xs font-medium text-center truncate w-full">
                      {mod.name}
                    </span>
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
}
