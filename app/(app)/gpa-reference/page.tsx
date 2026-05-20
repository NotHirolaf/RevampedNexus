"use client";

import dynamic from "next/dynamic";

const GpaReferenceView = dynamic(
  () =>
    import("@/components/modules/gpa-reference/gpa-reference-view").then(
      (m) => m.GpaReferenceView
    ),
  { ssr: false }
);

export default function GpaReferencePage() {
  return <GpaReferenceView />;
}
