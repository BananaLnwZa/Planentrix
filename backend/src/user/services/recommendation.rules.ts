import type {
  RecommendationAction,
  RecommendationItemDraft,
  WorkloadDemand,
} from "./recommendation.types";

export const MIN_BLOCK_MINUTES = 30;
export const STANDARD_BLOCK_MINUTES = 60;
export const REVIEW_CAP_MINUTES = 300;
export const HOMEWORK_CAP_MINUTES = 360;
export const WEAK_TOPIC_CAP_MINUTES = 180;

const pad = (value: number) => String(value).padStart(2, "0");

export const formatDate = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

export const parseDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

export const addDays = (value: string, days: number) => {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
};

export const daysBetween = (from: string, to: string) =>
  Math.floor((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);

export const isoDay = (date: string) => {
  const day = parseDate(date).getUTCDay();
  return day === 0 ? 7 : day;
};

export const mondayOfWeek = (date: string) => addDays(date, 1 - isoDay(date));

export const bangkokDateTimeParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
};

export const resolveTargetWeek = (
  triggerType: string,
  now = new Date(),
  explicitWeekStart?: string
) => {
  if (explicitWeekStart) {
    const monday = mondayOfWeek(explicitWeekStart);
    if (monday !== explicitWeekStart) {
      throw new Error("target_week_start must be a Monday");
    }
    return { weekStart: explicitWeekStart, weekEnd: addDays(explicitWeekStart, 6) };
  }
  const parts = bangkokDateTimeParts(now);
  const currentMonday = mondayOfWeek(parts.date);
  const isSundayEvening = isoDay(parts.date) === 7 && parts.hour >= 18;
  const useNextWeek = triggerType === "weekend" || isSundayEvening;
  const weekStart = useNextWeek ? addDays(currentMonday, 7) : currentMonday;
  return { weekStart, weekEnd: addDays(weekStart, 6) };
};

export const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number) =>
  `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00`;

export const durationMinutes = (start: string, end: string) =>
  Math.max(0, timeToMinutes(end) - timeToMinutes(start));

export const targetScoreFromGpa = (gpa: number | null) => {
  if (gpa === null || !Number.isFinite(gpa)) return null;
  if (gpa >= 4) return 80;
  if (gpa >= 3.5) return 75;
  if (gpa >= 3) return 70;
  if (gpa >= 2.5) return 65;
  if (gpa >= 2) return 60;
  if (gpa >= 1.5) return 55;
  if (gpa >= 1) return 50;
  return 0;
};

export const scoreGapMinutes = (gap: number) => {
  if (gap >= 20) return 90;
  if (gap >= 10) return 60;
  if (gap >= 5) return 30;
  return 0;
};

export const weakTopicMinutes = (count: number) =>
  Math.min(WEAK_TOPIC_CAP_MINUTES, Math.max(0, count) * 30);

export const examProximityMinutes = (
  weekStart: string,
  weekEnd: string,
  examRanges: Array<{ start: string; end: string }>
) => {
  const upcoming = examRanges
    .filter((range) => range.end >= weekStart)
    .map((range) => {
      if (range.start <= weekEnd && range.end >= weekStart) return 0;
      return Math.max(0, daysBetween(weekStart, range.start));
    })
    .sort((left, right) => left - right)[0];
  if (upcoming === undefined || upcoming > 21) return 0;
  if (upcoming >= 15) return 30;
  if (upcoming >= 8) return 60;
  return 90;
};

export const workloadUrgency = (
  referenceDate: string,
  deadlineDate: string
): Pick<WorkloadDemand, "priority" | "urgency"> & { minutes: number } => {
  const days = daysBetween(referenceDate, deadlineDate);
  if (days < 0) return { minutes: 60, priority: 1, urgency: "overdue" };
  if (days <= 2) {
    return { minutes: 60, priority: 2, urgency: "within_2_days" };
  }
  if (days <= 7) {
    return { minutes: 30, priority: 4, urgency: "within_3_7_days" };
  }
  return { minutes: 0, priority: 9, urgency: "later" };
};

export const quizPriority = (referenceDate: string, quizDate: string) =>
  daysBetween(referenceDate, quizDate) <= 2 ? 3 : 5;

export const derivePrimaryAction = (
  currentMinutes: number,
  allocatedMinutes: number,
  moved: boolean
): RecommendationAction => {
  if (currentMinutes === 0 && allocatedMinutes > 0) return "create";
  if (currentMinutes > 0 && allocatedMinutes === 0) return "remove";
  if (allocatedMinutes > currentMinutes) return moved ? "mixed" : "increase";
  if (allocatedMinutes < currentMinutes) return moved ? "mixed" : "decrease";
  if (moved) return "move";
  return "keep";
};

export const itemKey = (subjectId: string, scheduleTypeId: number) =>
  `${subjectId}:${scheduleTypeId}`;

export const compareDemandFairness = (
  left: RecommendationItemDraft,
  right: RecommendationItemDraft
) => {
  const leftRatio = left.targetMinutes <= 0 ? 1 : left.allocatedMinutes / left.targetMinutes;
  const rightRatio = right.targetMinutes <= 0 ? 1 : right.allocatedMinutes / right.targetMinutes;
  if (leftRatio !== rightRatio) return leftRatio - rightRatio;
  if (left.placementDeadline !== right.placementDeadline) {
    if (left.placementDeadline === null) return 1;
    if (right.placementDeadline === null) return -1;
    return left.placementDeadline.localeCompare(right.placementDeadline);
  }
  if (left.allocatedMinutes !== right.allocatedMinutes) {
    return left.allocatedMinutes - right.allocatedMinutes;
  }
  return left.subjectId.localeCompare(right.subjectId);
};

