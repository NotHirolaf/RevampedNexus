import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { QuickLink as LegacyQuickLink } from "@/types";

export interface QuickLink {
  id: string;
  name: string;
  url: string;
  icon?: string | null;
  faviconUrl?: string;
  order: number;
  createdAt: string;
}

function normalize(input: unknown): QuickLink | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Partial<QuickLink> &
    Partial<LegacyQuickLink> & { title?: string };
  if (!o.id || !o.url) return null;
  return {
    id: String(o.id),
    name: String((o.name as string | undefined) ?? o.title ?? "Untitled"),
    url: String(o.url),
    icon: (o.icon as string | null | undefined) ?? null,
    faviconUrl:
      typeof o.faviconUrl === "string" && o.faviconUrl ? o.faviconUrl : undefined,
    order: typeof o.order === "number" ? o.order : 0,
    createdAt: String(o.createdAt ?? new Date().toISOString()),
  };
}

interface LinkState {
  links: QuickLink[];
  addLink: (link: QuickLink) => void;
  updateLink: (id: string, partial: Partial<QuickLink>) => void;
  removeLink: (id: string) => void;
  reorderLinks: (ids: string[]) => void;
  setLinks: (links: unknown[]) => void;
}

export const useLinkStore = create<LinkState>()(
  persist(
    (set) => ({
      links: [],

      addLink: (link) =>
        set((state) => ({
          links: [...state.links, { ...link, order: state.links.length }],
        })),

      updateLink: (id, partial) =>
        set((state) => ({
          links: state.links.map((l) =>
            l.id === id ? { ...l, ...partial } : l
          ),
        })),

      removeLink: (id) =>
        set((state) => ({
          links: state.links.filter((l) => l.id !== id),
        })),

      reorderLinks: (ids) =>
        set((state) => {
          const map = new Map(state.links.map((l) => [l.id, l]));
          const next: QuickLink[] = [];
          ids.forEach((id, i) => {
            const l = map.get(id);
            if (l) {
              next.push({ ...l, order: i });
              map.delete(id);
            }
          });
          let i = next.length;
          for (const l of map.values()) {
            next.push({ ...l, order: i++ });
          }
          return { links: next };
        }),

      setLinks: (links) =>
        set(() => {
          const normalized = (Array.isArray(links) ? links : [])
            .map((l) => normalize(l))
            .filter((l): l is QuickLink => l !== null)
            .map((l, i) => ({ ...l, order: l.order ?? i }));
          return { links: normalized };
        }),
    }),
    {
      name: "nexus:links",
      version: 2,
      migrate: (persisted: unknown, _version: number) => {
        const p = persisted as { links?: unknown[] } | undefined;
        if (!p || !Array.isArray(p.links)) return { links: [] };
        const normalized = p.links
          .map((l) => normalize(l))
          .filter((l): l is QuickLink => l !== null)
          .map((l, i) => ({ ...l, order: l.order ?? i }));
        return { links: normalized };
      },
    }
  )
);
