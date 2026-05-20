import { create } from "zustand";
import { persist } from "zustand/middleware";

// All available widget keys (excluding greeting — that's always pinned at top)
export const WIDGET_REGISTRY: WidgetMeta[] = [
  { key: "next-class",          label: "Next Class",          moduleReq: ["timetable"],        colSpan2: true },
  { key: "today-schedule",      label: "Today's Schedule",    moduleReq: ["timetable"],        colSpan2: false },
  { key: "upcoming-deadlines",  label: "Upcoming Deadlines",  moduleReq: ["todos", "events"],  colSpan2: false },
  { key: "active-tasks",        label: "Tasks",               moduleReq: ["todos"],            colSpan2: false },
  { key: "current-gpa",         label: "GPA",                 moduleReq: ["gpa", "grades"],    colSpan2: false },
  { key: "focus-stats",         label: "Focus",               moduleReq: ["pomodoro"],         colSpan2: false },
  { key: "habit-streak",        label: "Habits",              moduleReq: ["habits"],           colSpan2: false },
  { key: "quick-links",         label: "Quick Links",         moduleReq: ["links"],            colSpan2: false },
];

export interface WidgetMeta {
  key: string;
  label: string;
  /** At least one of these modules must be enabled for the widget to be available */
  moduleReq: string[];
  colSpan2: boolean;
}

export const DEFAULT_ORDER = WIDGET_REGISTRY.map((w) => w.key);

interface DashboardState {
  /** Ordered list of widget keys the user wants to see. Greeting is always shown separately. */
  widgetOrder: string[];
  /** Which widgets are hidden by the user (even if the module is enabled) */
  hiddenWidgets: string[];
  /** Move a widget from one index to another */
  reorderWidget: (fromIndex: number, toIndex: number) => void;
  /** Toggle visibility of a widget */
  toggleWidget: (key: string) => void;
  /** Show a hidden widget (appends to end if not in order) */
  showWidget: (key: string) => void;
  /** Hide a widget */
  hideWidget: (key: string) => void;
  /** Reset to defaults */
  resetDashboard: () => void;
  /** Full setters for sync */
  setWidgetOrder: (order: string[]) => void;
  setHiddenWidgets: (hidden: string[]) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      widgetOrder: DEFAULT_ORDER,
      hiddenWidgets: [],

      reorderWidget: (fromIndex, toIndex) =>
        set((state) => {
          const order = [...state.widgetOrder];
          const [moved] = order.splice(fromIndex, 1);
          order.splice(toIndex, 0, moved);
          return { widgetOrder: order };
        }),

      toggleWidget: (key) =>
        set((state) => {
          const isHidden = state.hiddenWidgets.includes(key);
          if (isHidden) {
            // Show it — also ensure it's in the order list
            const hidden = state.hiddenWidgets.filter((k) => k !== key);
            const order = state.widgetOrder.includes(key)
              ? state.widgetOrder
              : [...state.widgetOrder, key];
            return { hiddenWidgets: hidden, widgetOrder: order };
          }
          return { hiddenWidgets: [...state.hiddenWidgets, key] };
        }),

      showWidget: (key) =>
        set((state) => ({
          hiddenWidgets: state.hiddenWidgets.filter((k) => k !== key),
          widgetOrder: state.widgetOrder.includes(key)
            ? state.widgetOrder
            : [...state.widgetOrder, key],
        })),

      hideWidget: (key) =>
        set((state) => ({
          hiddenWidgets: [...state.hiddenWidgets, key],
        })),

      resetDashboard: () =>
        set({ widgetOrder: DEFAULT_ORDER, hiddenWidgets: [] }),

      setWidgetOrder: (order) => set({ widgetOrder: order }),
      setHiddenWidgets: (hidden) => set({ hiddenWidgets: hidden }),
    }),
    { name: "nexus:dashboard" }
  )
);
