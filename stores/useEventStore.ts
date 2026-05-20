import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EventItem, EventType } from "@/types";

// Extra event types defined in the spec (kept here so we don't have to touch
// the shared `types/index.ts`).
export type ExtendedEventType = EventType | "meeting" | "registration";

export type RecurringPattern = "weekly" | "biweekly" | "monthly" | null;
export type ReminderOffset = number | null; // minutes before event, 0 = at event time

/**
 * Internal stored event — superset of the shared `EventItem`. Extra fields are
 * optional so the existing Canvas sync (which constructs an `EventItem`) is
 * still type-compatible.
 */
export interface StoredEvent extends Omit<EventItem, "type"> {
  type: ExtendedEventType;
  /** Free-text course tag used when Grade Tracker is not enabled. */
  courseTag?: string | null;
  /** Reference to a course in `useGradeStore` when Grade Tracker is enabled. */
  // courseId is inherited from EventItem
  recurring?: RecurringPattern;
  recurringGroupId?: string | null;
  reminder?: ReminderOffset;
}

export type ListOrCalendarView = "calendar" | "list";
export type SourceFilter = "all" | "manual" | "canvas";

interface EventState {
  items: StoredEvent[];
  view: ListOrCalendarView;
  sourceFilter: SourceFilter;
  addEvent: (item: StoredEvent) => void;
  addEvents: (items: StoredEvent[]) => void;
  updateEvent: (id: string, partial: Partial<StoredEvent>) => void;
  updateRecurringGroup: (
    groupId: string,
    partial: Partial<StoredEvent>,
    fromDate?: string
  ) => void;
  removeEvent: (id: string) => void;
  removeRecurringGroup: (groupId: string, fromDate?: string) => void;
  setEvents: (items: StoredEvent[]) => void;
  upsertCanvasEvent: (item: EventItem) => void;
  setView: (view: ListOrCalendarView) => void;
  setSourceFilter: (filter: SourceFilter) => void;
}

export const useEventStore = create<EventState>()(
  persist(
    (set) => ({
      items: [],
      view: "calendar",
      sourceFilter: "all",

      addEvent: (item) =>
        set((state) => ({ items: [item, ...state.items] })),

      addEvents: (items) =>
        set((state) => ({ items: [...items, ...state.items] })),

      updateEvent: (id, partial) =>
        set((state) => ({
          items: state.items.map((e) =>
            e.id === id ? { ...e, ...partial } : e
          ),
        })),

      updateRecurringGroup: (groupId, partial, fromDate) =>
        set((state) => ({
          items: state.items.map((e) => {
            if (e.recurringGroupId !== groupId) return e;
            if (fromDate && e.date < fromDate) return e;
            return { ...e, ...partial };
          }),
        })),

      removeEvent: (id) =>
        set((state) => ({
          items: state.items.filter((e) => e.id !== id),
        })),

      removeRecurringGroup: (groupId, fromDate) =>
        set((state) => ({
          items: state.items.filter((e) => {
            if (e.recurringGroupId !== groupId) return true;
            if (fromDate && e.date < fromDate) return true;
            return false;
          }),
        })),

      setEvents: (items) => set({ items }),

      upsertCanvasEvent: (item) =>
        set((state) => {
          const idx = state.items.findIndex(
            (e) =>
              e.canvasEventId === item.canvasEventId &&
              e.canvasCourseId === item.canvasCourseId &&
              e.canvasEventId !== null
          );
          if (idx >= 0) {
            const existing = state.items[idx];
            const updated = [...state.items];
            updated[idx] = {
              ...existing,
              title: item.title,
              date: item.date,
              time: item.time,
              endTime: item.endTime,
              type: item.type,
              canvasUrl: item.canvasUrl,
              cancelledOnCanvas: false,
            };
            return { items: updated };
          }
          return { items: [...state.items, item as StoredEvent] };
        }),

      setView: (view) => set({ view }),
      setSourceFilter: (filter) => set({ sourceFilter: filter }),
    }),
    {
      name: "nexus:events",
      partialize: (state) => ({
        items: state.items,
        view: state.view,
        sourceFilter: state.sourceFilter,
      }),
    }
  )
);
