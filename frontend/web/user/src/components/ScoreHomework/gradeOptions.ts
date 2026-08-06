import type { GradeLetter } from "@/interfaces/grade.interface";

export const GRADE_OPTIONS: Array<{
  grade: GradeLetter;
  gpa: number;
  scoreRange: string;
}> = [
  { grade: "A", gpa: 4, scoreRange: "80–100" },
  { grade: "B+", gpa: 3.5, scoreRange: "75–79" },
  { grade: "B", gpa: 3, scoreRange: "70–74" },
  { grade: "C+", gpa: 2.5, scoreRange: "65–69" },
  { grade: "C", gpa: 2, scoreRange: "60–64" },
  { grade: "D+", gpa: 1.5, scoreRange: "55–59" },
  { grade: "D", gpa: 1, scoreRange: "50–54" },
  { grade: "F", gpa: 0, scoreRange: "0–49" },
];

export const GPA_BY_GRADE = Object.fromEntries(
  GRADE_OPTIONS.map(({ grade, gpa }) => [grade, gpa])
) as Record<GradeLetter, number>;
