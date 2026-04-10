import type { Course, GradeCategory, ManualGPAEntry, GpaScale } from "@/types";

// ─── Letter grade → GPA point lookup tables ──────────────────────────────

const LETTER_TO_40: Record<string, number> = {
  "A+": 4.0,
  A: 4.0,
  "A-": 3.7,
  "B+": 3.3,
  B: 3.0,
  "B-": 2.7,
  "C+": 2.3,
  C: 2.0,
  "C-": 1.7,
  "D+": 1.3,
  D: 1.0,
  "D-": 0.7,
  F: 0.0,
};

const LETTER_TO_43: Record<string, number> = {
  ...LETTER_TO_40,
  "A+": 4.3,
};

// ─── Category / Course grade selectors ───────────────────────────────────

/**
 * Returns the category average as a percentage (0–100), or null if no items.
 * Uses cumulative method: sum(earned) / sum(possible) * 100.
 */
export function getCategoryAverage(category: GradeCategory): number | null {
  if (category.items.length === 0) return null;
  const totalEarned = category.items.reduce((s, i) => s + i.scoreEarned, 0);
  const totalPossible = category.items.reduce((s, i) => s + i.scorePossible, 0);
  if (totalPossible === 0) return null;
  return (totalEarned / totalPossible) * 100;
}

/**
 * Returns the weighted course grade as a percentage (0–100), or null if no
 * category has any items.  Only categories WITH items contribute; the grade
 * is scaled to the sum of those categories' weights (non-blocking for
 * partial entry).
 */
export function getCourseGrade(course: Course): number | null {
  let weightedSum = 0;
  let effectiveWeight = 0;

  for (const cat of course.categories) {
    if (cat.weight === 0) continue;
    const avg = getCategoryAverage(cat);
    if (avg === null) continue;
    weightedSum += avg * cat.weight;
    effectiveWeight += cat.weight;
  }

  if (effectiveWeight === 0) return null;
  return weightedSum / effectiveWeight;
}

// ─── Letter grade mapping ─────────────────────────────────────────────────

/** Maps a percentage to a standard US letter grade. */
export function getLetterGrade(pct: number): string {
  if (pct >= 93) return "A";
  if (pct >= 90) return "A-";
  if (pct >= 87) return "B+";
  if (pct >= 83) return "B";
  if (pct >= 80) return "B-";
  if (pct >= 77) return "C+";
  if (pct >= 73) return "C";
  if (pct >= 70) return "C-";
  if (pct >= 67) return "D+";
  if (pct >= 63) return "D";
  if (pct >= 60) return "D-";
  return "F";
}

// ─── GPA point conversion ─────────────────────────────────────────────────

/**
 * Converts a percentage grade to grade points on the user's chosen scale.
 */
export function percentageToGradePoints(
  pct: number,
  scale: GpaScale,
  customMax: number | null
): number {
  if (scale === "percentage") return pct;
  if (scale === "custom") {
    const max = customMax ?? 4.0;
    return (pct / 100) * max;
  }

  const letter = getLetterGrade(pct);
  const table = scale === "4.3" ? LETTER_TO_43 : LETTER_TO_40;
  return table[letter] ?? 0;
}

/**
 * Returns the GPA grade points for a course, or null if the course has no grade.
 */
export function getCourseGradePoints(
  course: Course,
  scale: GpaScale,
  customMax: number | null
): number | null {
  const pct = getCourseGrade(course);
  if (pct === null) return null;
  return percentageToGradePoints(pct, scale, customMax);
}

// ─── GPA calculations ────────────────────────────────────────────────────

function maxGpaForScale(scale: GpaScale, customMax: number | null): number {
  if (scale === "percentage") return 100;
  if (scale === "custom") return customMax ?? 4.0;
  if (scale === "4.3") return 4.3;
  return 4.0;
}

/**
 * Calculates GPA from a list of courses.
 * Only courses that have a computed grade contribute.
 */
export function calculateGPA(
  courses: Course[],
  scale: GpaScale,
  customMax: number | null
): { gpa: number; maxGpa: number } | null {
  let totalPoints = 0;
  let totalCredits = 0;

  for (const course of courses) {
    const pts = getCourseGradePoints(course, scale, customMax);
    if (pts === null) continue;
    totalPoints += pts * course.creditHours;
    totalCredits += course.creditHours;
  }

  if (totalCredits === 0) return null;
  return {
    gpa: totalPoints / totalCredits,
    maxGpa: maxGpaForScale(scale, customMax),
  };
}

/**
 * Calculates GPA for a specific semester only.
 */
export function calculateSemesterGPA(
  courses: Course[],
  semester: string,
  scale: GpaScale,
  customMax: number | null
): { gpa: number; maxGpa: number } | null {
  return calculateGPA(
    courses.filter((c) => c.semester === semester),
    scale,
    customMax
  );
}

/**
 * Calculates GPA from manual GPA store entries (letter grades).
 */
export function calculateManualGPA(
  entries: ManualGPAEntry[],
  scale: GpaScale,
  customMax: number | null
): { gpa: number; maxGpa: number } | null {
  let totalPoints = 0;
  let totalCredits = 0;

  const table = scale === "4.3" ? LETTER_TO_43 : LETTER_TO_40;

  for (const entry of entries) {
    const upper = entry.letterGrade.trim().toUpperCase();
    let pts: number;

    if (scale === "percentage") {
      const num = parseFloat(upper);
      pts = isNaN(num) ? (table[upper] ?? 0) * 25 : num;
    } else if (scale === "custom") {
      const max = customMax ?? 4.0;
      pts = ((table[upper] ?? 0) / 4.0) * max;
    } else {
      pts = table[upper] ?? 0;
    }

    totalPoints += pts * entry.creditHours;
    totalCredits += entry.creditHours;
  }

  if (totalCredits === 0) return null;
  return {
    gpa: totalPoints / totalCredits,
    maxGpa: maxGpaForScale(scale, customMax),
  };
}

/**
 * Returns all unique semesters across a list of courses, sorted lexicographically.
 */
export function getSortedSemesters(courses: Course[]): string[] {
  return [...new Set(courses.map((c) => c.semester))].sort();
}
