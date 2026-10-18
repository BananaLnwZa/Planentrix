import type { GradeBoundary, GradeLetter } from "@/interfaces/grade.interface";

export const STANDARD_GRADE_BOUNDARIES: GradeBoundary[] = [
  { grade_code: "A", minimum_percentage: 80, display_order: 1 },
  { grade_code: "B+", minimum_percentage: 75, display_order: 2 },
  { grade_code: "B", minimum_percentage: 70, display_order: 3 },
  { grade_code: "C+", minimum_percentage: 65, display_order: 4 },
  { grade_code: "C", minimum_percentage: 60, display_order: 5 },
  { grade_code: "D+", minimum_percentage: 55, display_order: 6 },
  { grade_code: "D", minimum_percentage: 50, display_order: 7 },
  { grade_code: "F", minimum_percentage: 0, display_order: 8 },
];

export const GRADE_OPTIONS: Array<{
  grade: GradeLetter;
  gpa: number;
}> = [
  { grade: "A", gpa: 4 },
  { grade: "B+", gpa: 3.5 },
  { grade: "B", gpa: 3 },
  { grade: "C+", gpa: 2.5 },
  { grade: "C", gpa: 2 },
  { grade: "D+", gpa: 1.5 },
  { grade: "D", gpa: 1 },
  { grade: "F", gpa: 0 },
];

export const GPA_BY_GRADE = Object.fromEntries(
  GRADE_OPTIONS.map(({ grade, gpa }) => [grade, gpa])
) as Record<GradeLetter, number>;
