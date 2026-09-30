import type { GradeCode } from "../../services/gradingScheme.service";

export const GRADE_TO_GPA: Record<GradeCode, number> = {
  A: 4,
  "B+": 3.5,
  B: 3,
  "C+": 2.5,
  C: 2,
  "D+": 1.5,
  D: 1,
  F: 0,
};

export interface PublishedGradeBoundary {
  grade_code: GradeCode;
  minimum_percentage: number;
  display_order: number;
}

export interface SubjectGradeCalculationInput {
  credits: number;
  actualScore: number;
  maximumScore: number;
  boundaries: PublishedGradeBoundary[];
}

export const gradeFromGpaBand = (gpa: number): GradeCode => {
  if (gpa >= 4) return "A";
  if (gpa >= 3.5) return "B+";
  if (gpa >= 3) return "B";
  if (gpa >= 2.5) return "C+";
  if (gpa >= 2) return "C";
  if (gpa >= 1.5) return "D+";
  if (gpa >= 1) return "D";
  return "F";
};

export const percentageFromScore = (
  actualScore: number,
  maximumScore: number,
) => {
  if (!Number.isFinite(maximumScore) || maximumScore <= 0) return null;
  const safeActual = Number.isFinite(actualScore) ? Math.max(actualScore, 0) : 0;
  return Math.min(100, (safeActual / maximumScore) * 100);
};

export const gradeFromPublishedBoundaries = (
  percentage: number,
  boundaries: PublishedGradeBoundary[],
) => {
  const ordered = [...boundaries].sort(
    (left, right) =>
      right.minimum_percentage - left.minimum_percentage ||
      left.display_order - right.display_order,
  );
  return ordered.find(
    (boundary) => percentage >= boundary.minimum_percentage,
  ) ?? null;
};

export const calculateWeightedGradeSummary = (
  subjects: SubjectGradeCalculationInput[],
) => {
  let evaluatedCredits = 0;
  let weightedGpa = 0;
  let weightedPercent = 0;
  let totalActualScore = 0;
  let totalMaximumScore = 0;
  let gradedSubjectCount = 0;
  let pendingGradingSchemeCount = 0;
  let unscoredSubjectCount = 0;

  for (const subject of subjects) {
    const credits = Number.isFinite(subject.credits)
      ? Math.max(subject.credits, 0)
      : 0;
    const actualScore = Number.isFinite(subject.actualScore)
      ? Math.max(subject.actualScore, 0)
      : 0;
    const maximumScore = Number.isFinite(subject.maximumScore)
      ? Math.max(subject.maximumScore, 0)
      : 0;
    totalActualScore += actualScore;
    totalMaximumScore += maximumScore;

    if (subject.boundaries.length === 0) {
      pendingGradingSchemeCount += 1;
      continue;
    }
    const percentage = percentageFromScore(actualScore, maximumScore);
    if (percentage === null) {
      unscoredSubjectCount += 1;
      continue;
    }
    const boundary = gradeFromPublishedBoundaries(
      percentage,
      subject.boundaries,
    );
    if (!boundary) {
      pendingGradingSchemeCount += 1;
      continue;
    }

    evaluatedCredits += credits;
    weightedGpa += GRADE_TO_GPA[boundary.grade_code] * credits;
    weightedPercent += percentage * credits;
    gradedSubjectCount += 1;
  }

  const gpa = evaluatedCredits > 0 ? weightedGpa / evaluatedCredits : 0;
  return {
    gpa,
    grade: evaluatedCredits > 0 ? gradeFromGpaBand(gpa) : null,
    percent:
      evaluatedCredits > 0 ? weightedPercent / evaluatedCredits : 0,
    totalCredits: evaluatedCredits,
    totalActualScore,
    totalMaximumScore,
    gradedSubjectCount,
    pendingGradingSchemeCount,
    unscoredSubjectCount,
  };
};
