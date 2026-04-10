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
  gpaManualEntries?: ManualGPAEntry[];
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

export interface TimetableEntry {
  id: string;
  courseCode: string;
  courseName: string;
  type: "lecture" | "lab" | "tutorial" | "seminar" | "other";
  day: DayOfWeek;
  startTime: string; // HH:MM (24h)
  endTime: string;   // HH:MM (24h)
  location: string;
  instructor: string;
  color: string;
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

export interface Habit {
  id: string;
  name: string;
  description: string;
  frequency: "daily" | "weekly";
  targetCount: number;
  createdAt: string;
  completions: string[]; // YYYY-MM-DD date strings
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
