"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Settings, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSidebar } from "@/components/ui/sidebar";
import { useMediaQuery } from "@/hooks/use-media-query";
import { getModuleById, modules, dashboardModule } from "@/lib/modules";

function getPageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/settings") return "Settings";
  const slug = pathname.replace("/", "");
  const mod = getModuleById(slug);
  return mod?.name ?? "Nexus";
}

export function TopBar() {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      {!isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      )}

      <h1 className="text-lg font-semibold truncate">{title}</h1>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="h-9 w-9" render={<Link href="/settings" />} aria-label="Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
