"use client";

import dynamic from "next/dynamic";

const KanbanView = dynamic(
  () => import("@/components/modules/kanban/kanban-view").then((m) => m.KanbanView),
  { ssr: false }
);

export default function KanbanPage() {
  return <KanbanView />;
}
