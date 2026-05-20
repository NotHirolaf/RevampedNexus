import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TodoItem, TodoPriority } from "@/types";

export type TodoPriorityFilter = "all" | "low" | "medium" | "high" | "urgent";
export type TodoSourceFilter = "all" | "manual" | "canvas";
export type TodoStatusFilter = "active" | "completed" | "all";
export type TodoSortBy = "dueDate" | "priority" | "createdAt";

export interface TodoFilters {
  priority: TodoPriorityFilter;
  courseId: string | "all";
  source: TodoSourceFilter;
  status: TodoStatusFilter;
  sortBy: TodoSortBy;
}

const defaultFilters: TodoFilters = {
  priority: "all",
  courseId: "all",
  source: "all",
  status: "active",
  sortBy: "dueDate",
};

interface TodoState {
  items: TodoItem[];
  filters: TodoFilters;
  addTodo: (item: TodoItem) => void;
  updateTodo: (id: string, partial: Partial<TodoItem>) => void;
  removeTodo: (id: string) => void;
  setTodos: (items: TodoItem[]) => void;
  upsertCanvasTodo: (item: TodoItem) => void;
  clearCompleted: () => void;
  setFilters: (partial: Partial<TodoFilters>) => void;
  resetFilters: () => void;
}

export const useTodoStore = create<TodoState>()(
  persist(
    (set) => ({
      items: [],
      filters: defaultFilters,

      addTodo: (item) =>
        set((state) => ({ items: [item, ...state.items] })),

      updateTodo: (id, partial) =>
        set((state) => ({
          items: state.items.map((t) =>
            t.id === id ? { ...t, ...partial } : t
          ),
        })),

      removeTodo: (id) =>
        set((state) => ({
          items: state.items.filter((t) => t.id !== id),
        })),

      setTodos: (items) => set({ items }),

      upsertCanvasTodo: (item) =>
        set((state) => {
          const idx = state.items.findIndex(
            (t) =>
              t.canvasAssignmentId === item.canvasAssignmentId &&
              t.canvasCourseId === item.canvasCourseId &&
              t.canvasAssignmentId !== null
          );
          if (idx >= 0) {
            const existing = state.items[idx];
            const updated = [...state.items];
            updated[idx] = {
              ...existing,
              title: item.title,
              dueDate: item.dueDate,
              priority: item.priority as TodoPriority,
              canvasUrl: item.canvasUrl,
              removedFromCanvas: false,
            };
            return { items: updated };
          }
          return { items: [...state.items, item] };
        }),

      clearCompleted: () =>
        set((state) => ({
          items: state.items.filter((t) => t.status !== "completed"),
        })),

      setFilters: (partial) =>
        set((state) => ({ filters: { ...state.filters, ...partial } })),

      resetFilters: () => set({ filters: defaultFilters }),
    }),
    { name: "nexus:todos" }
  )
);
