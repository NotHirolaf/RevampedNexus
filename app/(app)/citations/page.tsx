"use client";

import dynamic from "next/dynamic";

const CitationsView = dynamic(
  () =>
    import("@/components/modules/citations/citations-view").then(
      (m) => m.CitationsView
    ),
  { ssr: false }
);

export default function CitationsPage() {
  return <CitationsView />;
}
