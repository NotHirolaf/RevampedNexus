"use client";

import { useState } from "react";
import Link from "next/link";
import { Link as LinkIcon, Globe, ArrowRight } from "lucide-react";
import { useLinkStore } from "@/stores/useLinkStore";
import { useIsModuleEnabled } from "@/hooks/use-modules";
import { useMounted } from "@/hooks/use-hydration";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { Button } from "@/components/ui/button";

function LinkIconDisplay({
  icon,
  faviconUrl,
}: {
  icon?: string | null;
  faviconUrl?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (icon) {
    return <span className="text-base leading-none">{icon}</span>;
  }
  if (faviconUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={faviconUrl}
        alt=""
        width={20}
        height={20}
        className="size-5 rounded-sm"
        onError={() => setBroken(true)}
      />
    );
  }
  return <Globe className="size-4 text-muted-foreground" />;
}

export function QuickLinksWidget() {
  const mounted = useMounted();
  const allLinks = useLinkStore((s) => s.links);
  const enabled = useIsModuleEnabled("links");

  if (!enabled) return null;
  if (!mounted) {
    return (
      <WidgetCard title="Quick Links" icon={LinkIcon}>
        <div className="h-16" />
      </WidgetCard>
    );
  }

  const links = [...allLinks].sort((a, b) => a.order - b.order);

  if (links.length === 0) {
    return (
      <WidgetCard title="Quick Links" icon={LinkIcon}>
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <LinkIcon className="size-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            Save your frequently used links
          </p>
          <Button variant="outline" size="sm" render={<Link href="/links" />}>
            Add Links
            <ArrowRight className="size-4 ml-1" />
          </Button>
        </div>
      </WidgetCard>
    );
  }

  const top = links.slice(0, 4);

  return (
    <WidgetCard title="Quick Links" icon={LinkIcon}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {top.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={link.name}
              className="flex items-center justify-center size-9 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <LinkIconDisplay icon={link.icon} faviconUrl={link.faviconUrl} />
            </a>
          ))}
        </div>
        <Link
          href="/links"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </WidgetCard>
  );
}
