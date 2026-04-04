"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSection } from "@/components/settings/profile-section";
import { ModulesSection } from "@/components/settings/modules-section";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { DataSection } from "@/components/settings/data-section";
import { AboutSection } from "@/components/settings/about-section";
import { useMounted } from "@/hooks/use-hydration";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6">
          <ProfileSection />
        </TabsContent>
        <TabsContent value="modules" className="mt-6">
          <ModulesSection />
        </TabsContent>
        <TabsContent value="appearance" className="mt-6">
          <AppearanceSection />
        </TabsContent>
        <TabsContent value="data" className="mt-6">
          <DataSection />
        </TabsContent>
        <TabsContent value="about" className="mt-6">
          <AboutSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
