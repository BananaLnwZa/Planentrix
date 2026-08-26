import type { UserConstraint } from "@/interfaces/profile.interface";

export type ConstraintOverlap = {
  scheduleDay: number;
  startTime: string;
  endTime: string;
  reasons: string[];
};

const dayNames = [
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
  "อาทิตย์",
];

const trimTime = (value: string) => value.slice(0, 5);

const minutes = (value: string) => {
  const [hour, minute] = trimTime(value).split(":").map(Number);
  return hour * 60 + minute;
};

export const scheduleDayFromDate = (value: string) => {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 0 : date.getDay() || 7;
};

export const constraintDayName = (day: number) => dayNames[day - 1] ?? "-";

export function findConstraintOverlap(
  constraint: UserConstraint | null | undefined,
  input: { scheduleDay: number; startTime: string; endTime: string }
): ConstraintOverlap | null {
  if (!constraint || input.scheduleDay < 1 || input.scheduleDay > 7) {
    return null;
  }

  const start = minutes(input.startTime);
  const end = minutes(input.endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    return null;
  }

  const reasons: string[] = [];
  if (constraint.day_off === input.scheduleDay) {
    reasons.push(`ตรงกับวันหยุดประจำวัน${constraintDayName(input.scheduleDay)}`);
  }

  for (const busy of constraint.busy_days ?? []) {
    if (busy.day !== input.scheduleDay) continue;
    const busyStart = minutes(busy.start);
    const busyEnd = minutes(busy.end);
    if (start < busyEnd && end > busyStart) {
      reasons.push(
        `ทับกับเวลาที่ไม่ว่าง ${trimTime(busy.start)}–${trimTime(busy.end)}`
      );
    }
  }

  if (constraint.start_time && constraint.end_time) {
    const allowedStart = minutes(constraint.start_time);
    const allowedEnd = minutes(constraint.end_time);
    if (start < allowedStart || end > allowedEnd) {
      reasons.push(
        `อยู่นอกช่วงเวลาทำงาน ${trimTime(constraint.start_time)}–${trimTime(constraint.end_time)}`
      );
    }
  }

  return reasons.length
    ? {
        scheduleDay: input.scheduleDay,
        startTime: trimTime(input.startTime),
        endTime: trimTime(input.endTime),
        reasons: [...new Set(reasons)],
      }
    : null;
}
