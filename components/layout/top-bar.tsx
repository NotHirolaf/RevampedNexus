"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Settings, PanelLeft, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSidebar } from "@/components/ui/sidebar";
import { useMediaQuery } from "@/hooks/use-media-query";
import { getModuleById } from "@/lib/modules";
import { useMounted } from "@/hooks/use-hydration";
import { isFirebaseEnabled } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

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
  const mounted = useMounted();
  const title = getPageTitle(pathname);

  const user = useAuthStore((s) => s.user);
  const syncEnabled = useAuthStore((s) => s.syncEnabled);
  const lastSyncedAt = useAuthStore((s) => s.lastSyncedAt);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signOut = useAuthStore((s) => s.signOut);
  const toggleSync = useAuthStore((s) => s.toggleSync);

  // Only render auth UI after hydration to prevent SSR/client mismatch.
  const showAuth = mounted && isFirebaseEnabled;
  const isSignedIn = showAuth && !!user;

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
        {/* Sign in button — shown when Firebase is enabled and no user is signed in */}
        {showAuth && !isSignedIn && (
          <Button variant="ghost" size="sm" onClick={signInWithGoogle}>
            Sign in
          </Button>
        )}

        {/* Sync status + account dropdown — shown when signed in */}
        {isSignedIn && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="sm" className="gap-1.5" />}
              aria-label="Account menu"
            >
              {lastSyncedAt ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs">Synced</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-xs">Syncing</span>
                </>
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium truncate">
                    {user.displayName ?? "Account"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {/*
               * Plain div instead of DropdownMenuItem so that clicking the
               * Switch does not close the dropdown.
               */}
              <div className="flex items-center justify-between px-1.5 py-1">
                <span className="text-sm">Sync</span>
                <Switch
                  size="sm"
                  checked={syncEnabled}
                  onCheckedChange={toggleSync}
                  aria-label="Toggle sync"
                />
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem variant="destructive" onClick={signOut}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          render={<Link href="/settings" />}
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
