import type { GradeLetter } from "@/interfaces/grade.interface";

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
