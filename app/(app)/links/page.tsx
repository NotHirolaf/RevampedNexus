"use client";

import dynamic from "next/dynamic";

const LinksView = dynamic(
  () =>
    import("@/components/modules/links/links-view").then((m) => m.LinksView),
  { ssr: false }
);

export default function LinksPage() {
  return <LinksView />;
}
