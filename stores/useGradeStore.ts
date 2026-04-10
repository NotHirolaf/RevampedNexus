import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Course, GradeCategory, GradeItem } from "@/types";

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

  // Item actions
  addItem: (courseId: string, categoryId: string, item: GradeItem) => void;
  updateItem: (courseId: string, categoryId: string, itemId: string, partial: Partial<Omit<GradeItem, "id">>) => void;
  deleteItem: (courseId: string, categoryId: string, itemId: string) => void;
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
                      ? {
                          ...cat,
                          items: cat.items.filter(
                            (item) => item.id !== itemId
                          ),
                        }
                      : cat
                  ),
                }
              : c
          ),
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
