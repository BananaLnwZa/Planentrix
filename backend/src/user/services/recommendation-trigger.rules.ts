import {
  addDays,
  bangkokDateTimeParts,
  mondayOfWeek,
} from "./recommendation.rules";
import { getExamWorkflowPhase } from "./term-workflow";
import type { ExamTermDates } from "./term-workflow";

export const currentBangkokWeek = (now = new Date()) => {
  const weekStart = mondayOfWeek(bangkokDateTimeParts(now).date);
  return { weekStart, weekEnd: addDays(weekStart, 6) };
};

export const shouldRecommendForWorkload = (
  change: "created" | "updated",
  deadlineDate: string,
  previousDeadlineDate?: string,
  now = new Date(),
) => {
  const { weekStart, weekEnd } = currentBangkokWeek(now);
  return deadlineDate >= weekStart && deadlineDate <= weekEnd
    && (change === "created" || previousDeadlineDate !== deadlineDate);
};

export const regularRecommendationPaused = (
  term: ExamTermDates,
  now: Date,
  targetWeekStart: string,
) => {
  const targetDate = new Date(`${targetWeekStart}T12:00:00`);
  return [
    getExamWorkflowPhase(term, "midterm", now),
    getExamWorkflowPhase(term, "final", now),
    getExamWorkflowPhase(term, "midterm", targetDate),
    getExamWorkflowPhase(term, "final", targetDate),
  ].some((phase) => [
    "midterm_2w", "midterm_1w", "midterm_exam",
    "final_2w", "final_1w", "final_exam", "final_post",
  ].includes(phase));
};
