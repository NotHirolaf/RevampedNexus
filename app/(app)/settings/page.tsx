"use client";

import { useState, useRef } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSection } from "@/components/settings/profile-section";
import { ModulesSection } from "@/components/settings/modules-section";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { DataSection } from "@/components/settings/data-section";
import { AccountSection } from "@/components/settings/account-section";
import { AboutSection } from "@/components/settings/about-section";
import { CanvasSection } from "@/components/settings/canvas-section";
import { useMounted } from "@/hooks/use-hydration";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "motion/react";

const TAB_ORDER = ["profile", "modules", "appearance", "data", "canvas", "account", "about"] as const;
type TabValue = (typeof TAB_ORDER)[number];

const TAB_CONTENT: Record<TabValue, React.ReactNode> = {
  profile: <ProfileSection />,
  modules: <ModulesSection />,
  appearance: <AppearanceSection />,
  data: <DataSection />,
  canvas: <CanvasSection />,
  account: <AccountSection />,
  about: <AboutSection />,
};

export default function SettingsPage() {
  const mounted = useMounted();
  const [activeTab, setActiveTab] = useState<TabValue>("profile");
  const prevIndex = useRef(0);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  function handleTabChange(value: string | number | null) {
    if (value === null) return;
    const val = String(value) as TabValue;
    prevIndex.current = TAB_ORDER.indexOf(activeTab);
    setActiveTab(val);
  }

  const currentIndex = TAB_ORDER.indexOf(activeTab);
  const direction = currentIndex > prevIndex.current ? 1 : -1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="canvas">Canvas LMS</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {TAB_CONTENT[activeTab]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
