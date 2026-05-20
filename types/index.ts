import type { LucideIcon } from "lucide-react";

export type ModuleCategory =
  | "academics"
  | "productivity"
  | "scheduling"
  | "social"
  | "reference";

export interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: ModuleCategory;
  defaultEnabled: boolean;
  route: string;
}

export type GpaScale = "4.0" | "4.3" | "percentage" | "custom";

export interface UserProfile {
  displayName: string;
  university: string;
  semester: string;
  gpaScale: GpaScale;
  customGpaMax: number | null;
  creditsObtained: number | null;
  creditsRequired: number | null;
}

export type AccentColor =
  | "blue"
  | "purple"
  | "green"
  | "orange"
  | "pink"
  | "teal"
  | "red"
  | "amber";

export interface ExportData {
  version: string;
  timestamp: string;
  modules: Record<string, boolean>;
  profile: UserProfile;
  onboarding: { completed: boolean };
  theme: { accentColor: AccentColor };
  // v2 fields (optional for backward compat with v1 imports)
  todos?: TodoItem[];
  events?: EventItem[];
  timetable?: TimetableEntry[];
  grades?: GradeEntry[]; // deprecated v2 — kept for backward-compat import
  courses?: Course[];
  gpaManualEntries?: ManualGPAEntry[]; // legacy — pre-semesterUpdates schema
  gpaData?: {
    baseCGPA: number | null;
    baseCredits: number;
    semesterUpdates: {
      id: string;
      label: string;
      sGPA: number;
      credits: number;
    }[];
  };
  pomodoroSessions?: PomodoroSession[];
  pomodoroSettings?: PomodoroSettings;
  links?: QuickLink[];
  habits?: Habit[];
  canvasConfig?: {
    baseUrl: string;
    selectedCourseIds: number[];
    syncIntervalMinutes: number;
  };
  dashboardLayout?: {
    widgetOrder: string[];
    hiddenWidgets: string[];
  };
}

// ─── Todo ────────────────────────────────────────────────────────────────

export type TodoPriority = "low" | "medium" | "high" | "urgent";
export type TodoStatus = "pending" | "in_progress" | "completed";

export interface TodoItem {
  id: string;
  title: string;
  description: string;
  priority: TodoPriority;
  status: TodoStatus;
  dueDate: string | null;
  courseId: string | null;
  createdAt: string;
  completedAt: string | null;
  source: "manual" | "canvas";
  removedFromCanvas?: boolean;
  canvasAssignmentId: number | null;
  canvasCourseId: number | null;
  canvasUrl: string | null;
}

// ─── Events ──────────────────────────────────────────────────────────────

export type EventType =
  | "exam"
  | "assignment"
  | "custom"
  | "deadline"
  | "lab"
  | "lecture";

export interface EventItem {
  id: string;
  title: string;
  description: string;
  type: EventType;
  date: string;
  time: string | null;
  endTime: string | null;
  allDay: boolean;
  courseId: string | null;
  createdAt: string;
  source: "manual" | "canvas";
  cancelledOnCanvas?: boolean;
  canvasEventId: number | null;
  canvasCourseId: number | null;
  canvasUrl: string | null;
}

// ─── Timetable ───────────────────────────────────────────────────────────

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type TimetableCategory =
  | "class"
  | "study"
  | "break"
  | "personal"
  | "other";

export interface TimetableEntry {
  id: string;
  title: string;
  category: TimetableCategory;
  day: DayOfWeek;
  startTime: string; // HH:MM (24h)
  endTime: string;   // HH:MM (24h)
  color: string;
  notes?: string;
  // Optional legacy / extra fields (retained for forward-compat)
  courseCode?: string;
  courseName?: string;
  type?: "lecture" | "lab" | "tutorial" | "seminar" | "other";
  location?: string;
  instructor?: string;
}

// ─── Grades ──────────────────────────────────────────────────────────────

// v2 flat model — kept for backward-compat export/import only
export interface GradeEntry {
  id: string;
  courseCode: string;
  courseName: string;
  credits: number;
  grade: string;
  semester: string;
  createdAt: string;
}

// v3 hierarchical model (Course > Category > Item)
export interface GradeItem {
  id: string;
  name: string;
  scoreEarned: number;
  scorePossible: number;
  weight?: number; // optional contribution weight (e.g. 30 = 30%). Defaults to equal weight when absent.
  date: string; // ISO date string YYYY-MM-DD
}

export interface GradeCategory {
  id: string;
  name: string;
  weight: number; // 0–100, percentage weight of this category in the course
  items: GradeItem[];
}

export interface Course {
  id: string;
  name: string;
  code: string;
  creditHours: number;
  color: string; // hex color, e.g. "#6366f1"
  categories: GradeCategory[];
  semester: string; // e.g. "Fall 2025"
}

// ─── GPA Store ───────────────────────────────────────────────────────────

export interface ManualGPAEntry {
  id: string;
  courseName: string;
  creditHours: number;
  letterGrade: string; // "A", "B+", etc.
  semester: string;
}

export interface WhatIfEntry {
  id: string;
  courseName: string;
  creditHours: number;
  letterGrade: string;
  semester: string;
}

// ─── Pomodoro ────────────────────────────────────────────────────────────

export interface PomodoroSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number;
  type: "work" | "short_break" | "long_break";
  completed: boolean;
}

export interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
}

// ─── Quick Links ─────────────────────────────────────────────────────────

export interface QuickLink {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  category: string;
  createdAt: string;
}

// ─── Habits ──────────────────────────────────────────────────────────────

export type HabitFrequency = "daily" | "weekdays" | "custom";

export interface Habit {
  id: string;
  name: string;
  icon?: string; // emoji string (e.g., "📚") or Lucide icon name
  color: string; // hex color used for heatmap accent
  frequency: HabitFrequency;
  customDays?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  completions: string[]; // YYYY-MM-DD date strings
  createdAt: string;
  order: number;
}

// ─── Kanban ──────────────────────────────────────────────────────────────

export type KanbanPriority = "low" | "medium" | "high";

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  courseTag?: string;
  dueDate?: string; // ISO date YYYY-MM-DD
  priority?: KanbanPriority;
  labels?: string[];
  createdAt: string;
}

export interface KanbanColumn {
  id: string;
  name: string;
  cards: KanbanCard[];
}

export interface KanbanBoard {
  id: string;
  name: string;
  columns: KanbanColumn[];
  createdAt: string;
}

// ─── Canvas LMS ──────────────────────────────────────────────────────────

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  due_at: string | null;
  html_url: string;
  course_id: number;
  points_possible: number;
}

export interface CanvasCalendarEvent {
  id: number;
  title: string;
  start_at: string;
  end_at: string;
  html_url: string;
  context_code: string;
}
