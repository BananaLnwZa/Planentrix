import type { StudyTypeName } from "@/interfaces/time.interface";
import { formatDisplayMonthYear } from "@/utils/dateTime";

export const studyTypeLabels: Record<StudyTypeName, string> = {
  reading: "อ่านตำรา/เอกสาร",
  practice: "ทำโจทย์/ฝึกปฏิบัติ",
  video: "ดูวิดีโอ/lecture",
  review: "ทบทวน/สรุปบทเรียน",
};

export const studyTypeColors: Record<StudyTypeName, string> = {
  reading: "#91c9ef",
  practice: "#f6b7cc",
  video: "#f5c779",
  review: "#9ed7bd",
};

export const formatClock = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

export const formatDuration = (minutes: number, compact = false) => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  if (compact) {
    return `${String(hours).padStart(2, "0")} ชม. ${String(
      remainingMinutes
    ).padStart(2, "0")} นาที`;
  }
  return hours > 0
    ? `${hours} ชั่วโมง ${remainingMinutes} นาที`
    : `${remainingMinutes} นาที`;
};

export const formatThaiMonth = (monthKey: string) => {
  return formatDisplayMonthYear(monthKey);
};
