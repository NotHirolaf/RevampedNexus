"use client";

import dynamic from "next/dynamic";

const TodosView = dynamic(
  () => import("@/components/modules/todos/todos-view").then((m) => m.TodosView),
  { ssr: false }
);

export default function TodosPage() {
  return <TodosView />;
}
