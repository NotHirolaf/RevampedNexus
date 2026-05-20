"use client";

import { AccentColorProvider } from "@/components/accent-provider";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AccentColorProvider>
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] dark:bg-[#1a1a2e] p-4">
        {children}
      </div>
    </AccentColorProvider>
  );
}
