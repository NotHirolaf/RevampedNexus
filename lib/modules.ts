import {
  GraduationCap,
  Calculator,
  BookOpenCheck,
  CheckSquare,
  Timer,
  Activity,
  Kanban,
  CalendarDays,
  BookOpen,
  CalendarClock,
  FileText,
  Link,
  Quote,
  LayoutDashboard,
} from "lucide-react";
import type { ModuleConfig, ModuleCategory } from "@/types";

export const MODULE_CATEGORIES: Record<ModuleCategory, string> = {
  academics: "Academics",
  productivity: "Productivity",
  scheduling: "Scheduling",
  social: "Social & Collaboration",
  reference: "Reference & Utilities",
};

export const CATEGORY_ORDER: ModuleCategory[] = [
  "academics",
  "productivity",
  "scheduling",
  "social",
  "reference",
];

export const modules: ModuleConfig[] = [
  // Academics
  {
    id: "grades",
    name: "Grade Tracker",
    description: "Track grades across all your courses",
    icon: GraduationCap,
    category: "academics",
    defaultEnabled: true,
    route: "/grades",
  },
  {
    id: "gpa",
    name: "GPA Calculator",
    description: "Calculate your cumulative and semester GPA",
    icon: Calculator,
    category: "academics",
    defaultEnabled: true,
    route: "/gpa",
  },
  {
    id: "gpa-reference",
    name: "GPA Reference",
    description: "GPA-to-letter-grade conversion chart",
    icon: BookOpenCheck,
    category: "academics",
    defaultEnabled: false,
    route: "/gpa-reference",
  },

  // Productivity
  {
    id: "todos",
    name: "To-Do List",
    description: "Manage tasks with priorities and deadlines",
    icon: CheckSquare,
    category: "productivity",
    defaultEnabled: true,
    route: "/todos",
  },
  {
    id: "pomodoro",
    name: "Pomodoro Timer",
    description: "Focus timer with work and break intervals",
    icon: Timer,
    category: "productivity",
    defaultEnabled: true,
    route: "/pomodoro",
  },
  {
    id: "habits",
    name: "Habit Tracker",
    description: "Build and track daily habits",
    icon: Activity,
    category: "productivity",
    defaultEnabled: false,
    route: "/habits",
  },
  {
    id: "kanban",
    name: "Kanban Board",
    description: "Organize projects with drag-and-drop boards",
    icon: Kanban,
    category: "productivity",
    defaultEnabled: false,
    route: "/kanban",
  },

  // Scheduling
  {
    id: "timetable",
    name: "Weekly Timetable",
    description: "View your weekly class schedule at a glance",
    icon: CalendarDays,
    category: "scheduling",
    defaultEnabled: true,
    route: "/timetable",
  },
  {
    id: "planner",
    name: "Study Planner",
    description: "Plan study sessions and track progress",
    icon: BookOpen,
    category: "scheduling",
    defaultEnabled: false,
    route: "/planner",
  },
  {
    id: "events",
    name: "Events & Reminders",
    description: "Keep track of deadlines and important dates",
    icon: CalendarClock,
    category: "scheduling",
    defaultEnabled: false,
    route: "/events",
  },

  // Social & Collaboration
  {
    id: "notes",
    name: "Shared Notes",
    description: "Share and discover resource links and notes",
    icon: FileText,
    category: "social",
    defaultEnabled: false,
    route: "/notes",
  },

  // Reference & Utilities
  {
    id: "links",
    name: "Quick Links",
    description: "Save frequently used university links",
    icon: Link,
    category: "reference",
    defaultEnabled: false,
    route: "/links",
  },
  {
    id: "citations",
    name: "Citation Generator",
    description: "Generate citations in APA, MLA, and more",
    icon: Quote,
    category: "reference",
    defaultEnabled: false,
    route: "/citations",
  },
];

export const dashboardModule: ModuleConfig = {
  id: "dashboard",
  name: "Dashboard",
  description: "Your personalized home screen",
  icon: LayoutDashboard,
  category: "academics",
  defaultEnabled: true,
  route: "/dashboard",
};

export function getModuleById(id: string): ModuleConfig | undefined {
  if (id === "dashboard") return dashboardModule;
  return modules.find((m) => m.id === id);
}

export function getModulesByCategory(category: ModuleCategory): ModuleConfig[] {
  return modules.filter((m) => m.category === category);
}

export function getDefaultEnabledModules(): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const mod of modules) {
    result[mod.id] = mod.defaultEnabled;
  }
  return result;
}
