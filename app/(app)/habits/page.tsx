"use client";

import dynamic from "next/dynamic";

const HabitsView = dynamic(
  () => import("@/components/modules/habits/habits-view").then((m) => m.HabitsView),
  { ssr: false }
);

export default function HabitsPage() {
  return <HabitsView />;
}
