"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Settings } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { useModuleStore } from "@/stores/module-store";
import { modules, MODULE_CATEGORIES, CATEGORY_ORDER } from "@/lib/modules";
import { useMounted } from "@/hooks/use-hydration";
import { Skeleton } from "@/components/ui/skeleton";

export function AppSidebar() {
  const pathname = usePathname();
  const enabledModules = useModuleStore((s) => s.enabledModules);
  const mounted = useMounted();

  const enabledModuleConfigs = modules.filter(
    (m) => enabledModules[m.id]
  );

  const groupedModules = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: MODULE_CATEGORIES[cat],
    items: enabledModuleConfigs.filter((m) => m.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <Logo />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Dashboard — always visible */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/dashboard" />}
                isActive={pathname === "/dashboard"}
                tooltip="Dashboard"
              >
                <LayoutDashboard className="size-4" />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Module groups */}
        {!mounted ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="space-y-2 px-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded-md" />
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          groupedModules.map((group) => (
            <SidebarGroup key={group.category}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((mod) => (
                    <SidebarMenuItem key={mod.id}>
                      <SidebarMenuButton
                        render={<Link href={mod.route} />}
                        isActive={pathname === mod.route}
                        tooltip={mod.name}
                      >
                        <mod.icon className="size-4" />
                        <span>{mod.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/settings" />}
              isActive={pathname === "/settings"}
              tooltip="Settings"
            >
              <Settings className="size-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
