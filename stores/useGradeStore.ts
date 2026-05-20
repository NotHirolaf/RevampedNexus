import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Course, GradeCategory, GradeItem } from "@/types";

/** ID of the implicit single category used by the flat (no-category) UI. */
export const FLAT_CAT_ID = "__flat__";

interface GradeState {
  courses: Course[];

  // Course actions
  addCourse: (course: Course) => void;
  updateCourse: (id: string, partial: Partial<Omit<Course, "id" | "categories">>) => void;
  deleteCourse: (id: string) => void;
  setCourses: (courses: Course[]) => void;

  // Category actions
  addCategory: (courseId: string, category: GradeCategory) => void;
  updateCategory: (courseId: string, categoryId: string, partial: Partial<Omit<GradeCategory, "id" | "items">>) => void;
  deleteCategory: (courseId: string, categoryId: string) => void;

  // Item actions (category-aware)
  addItem: (courseId: string, categoryId: string, item: GradeItem) => void;
  updateItem: (courseId: string, categoryId: string, itemId: string, partial: Partial<Omit<GradeItem, "id">>) => void;
  deleteItem: (courseId: string, categoryId: string, itemId: string) => void;

  // Flat item actions (no category — uses FLAT_CAT_ID, creates it if absent)
  addItemFlat: (courseId: string, item: GradeItem) => void;
  updateItemFlat: (courseId: string, itemId: string, partial: Partial<Omit<GradeItem, "id">>) => void;
  deleteItemFlat: (courseId: string, itemId: string) => void;
  reorderItemsFlat: (courseId: string, fromIndex: number, toIndex: number) => void;
}

export const useGradeStore = create<GradeState>()(
  persist(
    (set) => ({
      courses: [],

      // ── Course actions ──────────────────────────────────────────────────
      addCourse: (course) =>
        set((s) => ({ courses: [...s.courses, course] })),

      updateCourse: (id, partial) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === id ? { ...c, ...partial } : c
          ),
        })),

      deleteCourse: (id) =>
        set((s) => ({ courses: s.courses.filter((c) => c.id !== id) })),

      setCourses: (courses) => set({ courses }),

      // ── Category actions ────────────────────────────────────────────────
      addCategory: (courseId, category) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === courseId
              ? { ...c, categories: [...c.categories, category] }
              : c
          ),
        })),

      updateCategory: (courseId, categoryId, partial) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === courseId
              ? {
                  ...c,
                  categories: c.categories.map((cat) =>
                    cat.id === categoryId ? { ...cat, ...partial } : cat
                  ),
                }
              : c
          ),
        })),

      deleteCategory: (courseId, categoryId) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === courseId
              ? {
                  ...c,
                  categories: c.categories.filter(
                    (cat) => cat.id !== categoryId
                  ),
                }
              : c
          ),
        })),

      // ── Item actions ────────────────────────────────────────────────────
      addItem: (courseId, categoryId, item) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === courseId
              ? {
                  ...c,
                  categories: c.categories.map((cat) =>
                    cat.id === categoryId
                      ? { ...cat, items: [...cat.items, item] }
                      : cat
                  ),
                }
              : c
          ),
        })),

      updateItem: (courseId, categoryId, itemId, partial) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === courseId
              ? {
                  ...c,
                  categories: c.categories.map((cat) =>
                    cat.id === categoryId
                      ? {
                          ...cat,
                          items: cat.items.map((item) =>
                            item.id === itemId
                              ? { ...item, ...partial }
                              : item
                          ),
                        }
                      : cat
                  ),
                }
              : c
          ),
        })),

      deleteItem: (courseId, categoryId, itemId) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === courseId
              ? {
                  ...c,
                  categories: c.categories.map((cat) =>
                    cat.id === categoryId
                      ? { ...cat, items: cat.items.filter((item) => item.id !== itemId) }
                      : cat
                  ),
                }
              : c
          ),
        })),

      // ── Flat item actions ───────────────────────────────────────────────
      addItemFlat: (courseId, item) =>
        set((s) => ({
          courses: s.courses.map((c) => {
            if (c.id !== courseId) return c;
            const hasCat = c.categories.some((cat) => cat.id === FLAT_CAT_ID);
            const categories = hasCat
              ? c.categories.map((cat) =>
                  cat.id === FLAT_CAT_ID
                    ? { ...cat, items: [...cat.items, item] }
                    : cat
                )
              : [
                  ...c.categories,
                  { id: FLAT_CAT_ID, name: "Grades", weight: 100, items: [item] },
                ];
            return { ...c, categories };
          }),
        })),

      updateItemFlat: (courseId, itemId, partial) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id !== courseId
              ? c
              : {
                  ...c,
                  categories: c.categories.map((cat) => ({
                    ...cat,
                    items: cat.items.map((item) =>
                      item.id === itemId ? { ...item, ...partial } : item
                    ),
                  })),
                }
          ),
        })),

      deleteItemFlat: (courseId, itemId) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id !== courseId
              ? c
              : {
                  ...c,
                  categories: c.categories.map((cat) => ({
                    ...cat,
                    items: cat.items.filter((item) => item.id !== itemId),
                  })),
                }
          ),
        })),

      reorderItemsFlat: (courseId, fromIndex, toIndex) =>
        set((s) => ({
          courses: s.courses.map((c) => {
            if (c.id !== courseId) return c;
            const allItems = c.categories.flatMap((cat) => cat.items);
            const reordered = [...allItems];
            const [moved] = reordered.splice(fromIndex, 1);
            reordered.splice(toIndex, 0, moved);
            // Consolidate into the single flat category
            return {
              ...c,
              categories: [
                { id: FLAT_CAT_ID, name: "Grades", weight: 100, items: reordered },
              ],
            };
          }),
        })),
    }),
    {
      name: "nexus:grades",
      version: 3,
      migrate: (persisted, version) => {
        // v1/v2 used { entries: [] } — discard and start fresh
        if (version < 3) return { courses: [] };
        return persisted as GradeState;
      },
    }
  )
);
