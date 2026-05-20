"use client";

import dynamic from "next/dynamic";

const EventsView = dynamic(
  () =>
    import("@/components/modules/events/events-view").then((m) => m.EventsView),
  { ssr: false }
);

export default function EventsPage() {
  return <EventsView />;
}
