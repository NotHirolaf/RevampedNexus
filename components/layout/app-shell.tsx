"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { useMediaQuery } from "@/hooks/use-media-query";
import { AccentColorProvider } from "@/components/accent-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const isMobile = useMediaQuery("(max-width: 767px)");

  return (
    <AccentColorProvider>
      <SidebarProvider>
        {!isMobile && <AppSidebar />}
        <SidebarInset>
          <TopBar />
          <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6 pb-20 md:pb-6">
            {children}
          </main>
        </SidebarInset>
        {isMobile && <BottomNav />}
      </SidebarProvider>
    </AccentColorProvider>
  );
}
