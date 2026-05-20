"use client";

import dynamic from "next/dynamic";

const NotesView = dynamic(
  () =>
    import("@/components/modules/notes/notes-view").then((m) => m.NotesView),
  { ssr: false }
);

export default function NotesPage() {
  return <NotesView />;
}
