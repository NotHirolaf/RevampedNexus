"use client";

import dynamic from "next/dynamic";

const PomodoroView = dynamic(
  () =>
    import("@/components/modules/pomodoro/pomodoro-view").then(
      (m) => m.PomodoroView
    ),
  { ssr: false }
);

export default function PomodoroPage() {
  return <PomodoroView />;
}
