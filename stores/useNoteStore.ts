import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ResourceType =
  | "notes"
  | "video"
  | "textbook"
  | "article"
  | "slides"
  | "other";

export interface ResourceLink {
  id: string;
  title: string;
  url: string;
  notes?: string;
  type: ResourceType;
  addedAt: string;
}

export interface NoteCollection {
  id: string;
  title: string;
  courseTag?: string;
  description?: string;
  links: ResourceLink[];
  createdAt: string;
}

interface NoteState {
  collections: NoteCollection[];
  addCollection: (c: NoteCollection) => void;
  updateCollection: (
    id: string,
    partial: Partial<Omit<NoteCollection, "id" | "links">>
  ) => void;
  removeCollection: (id: string) => void;
  addResource: (collectionId: string, resource: ResourceLink) => void;
  updateResource: (
    collectionId: string,
    resourceId: string,
    partial: Partial<Omit<ResourceLink, "id">>
  ) => void;
  removeResource: (collectionId: string, resourceId: string) => void;
  setCollections: (collections: NoteCollection[]) => void;
}

export const useNoteStore = create<NoteState>()(
  persist(
    (set) => ({
      collections: [],

      addCollection: (c) =>
        set((s) => ({ collections: [...s.collections, c] })),

      updateCollection: (id, partial) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === id ? { ...c, ...partial } : c
          ),
        })),

      removeCollection: (id) =>
        set((s) => ({
          collections: s.collections.filter((c) => c.id !== id),
        })),

      addResource: (collectionId, resource) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId
              ? { ...c, links: [...c.links, resource] }
              : c
          ),
        })),

      updateResource: (collectionId, resourceId, partial) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  links: c.links.map((l) =>
                    l.id === resourceId ? { ...l, ...partial } : l
                  ),
                }
              : c
          ),
        })),

      removeResource: (collectionId, resourceId) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId
              ? { ...c, links: c.links.filter((l) => l.id !== resourceId) }
              : c
          ),
        })),

      setCollections: (collections) => set({ collections }),
    }),
    { name: "nexus:notes" }
  )
);
