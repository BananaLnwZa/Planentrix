import type { DisplayScheduleItem } from "@/interfaces/table.interface";
import ScheduleBlock from "./ScheduleBlock";

const scheduleDays = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
const dayHeaderColors = [
  "bg-[#FFF0B8]", "bg-[#FFD7E5]", "bg-[#DDF0C7]", "bg-[#FFE0C9]",
  "bg-[#D6EBFA]", "bg-[#DDDDF8]", "bg-[#F8D1CD]",
];

const DAY_WIDTH = 58;
const HOUR_WIDTH = 80;
const DAY_HEIGHT = 52;

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function getScheduleHourRange(items: DisplayScheduleItem[]) {
  const validRanges = items
    .map((item) => ({ start: timeToMinutes(item.start_time), end: timeToMinutes(item.end_time) }))
    .filter(({ start, end }) => Number.isFinite(start) && Number.isFinite(end) && end > start);
  if (validRanges.length === 0) return null;

  const earliestStart = Math.min(...validRanges.map(({ start }) => start));
  const latestEnd = Math.max(...validRanges.map(({ end }) => end));
  const startHour = Math.max(0, Math.floor(earliestStart / 60));
  const endHour = Math.min(24, Math.max(startHour + 10, Math.ceil(latestEnd / 60)));
  return { startHour, endHour };
}

function getBlockPosition(item: DisplayScheduleItem, startHour: number, endHour: number) {
  const gridStart = startHour * 60;
  const start = Math.max(gridStart, timeToMinutes(item.start_time));
  const end = Math.min(endHour * 60, timeToMinutes(item.end_time));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return {
    left: ((start - gridStart) / 60) * HOUR_WIDTH + 2,
    width: ((end - start) / 60) * HOUR_WIDTH - 4,
    top: 3,
    height: DAY_HEIGHT - 6,
  };
}

export default function ScheduleGrid({
  items,
  onSelect,
}: {
  items: DisplayScheduleItem[];
  onSelect: (item: DisplayScheduleItem) => void;
}) {
  const range = getScheduleHourRange(items);
  if (!range) return null;
  const { startHour, endHour } = range;
  const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index);
  const timeWidth = hours.length * HOUR_WIDTH;

  return (
    <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden rounded-[14px]" aria-label="ตารางเวลารายสัปดาห์ เลื่อนซ้ายขวาเพื่อดูเวลา">
      <div
        className="text-[#52636D]"
        style={{ width: DAY_WIDTH + timeWidth, fontFamily: "var(--font-sansation)" }}
      >
        <div className="flex h-10 rounded-t-[14px] bg-white shadow-[0_2px_7px_rgba(104,79,89,0.14)]">
          <div className="sticky left-0 z-20 flex shrink-0 items-center justify-center border-r border-[#E2C7D1] bg-white text-[12px] text-[#426477]" style={{ width: DAY_WIDTH }}>
            วัน
          </div>
          <div className="relative flex" style={{ width: timeWidth }}>
            {hours.map((hour) => (
              <div key={hour} className="h-10 shrink-0 border-r border-[#E7DDE2] bg-[#F4FAFD] pl-2 pt-2 text-[11px] text-[#58798A]" style={{ width: HOUR_WIDTH }}>
                {formatHour(hour)}
              </div>
            ))}
            <span className="pointer-events-none absolute right-1 top-2 text-[11px] text-[#58798A]">{formatHour(endHour)}</span>
          </div>
        </div>
        <div className="rounded-b-xl border border-t-0 border-[#DECBD2] bg-white shadow-[0_3px_6px_rgba(104,79,89,0.14)]">
          {scheduleDays.map((day, dayIndex) => (
            <div key={day} className="flex border-b border-[#EEE1E6] last:border-b-0" style={{ height: DAY_HEIGHT }}>
              <div
                className={`sticky left-0 z-10 flex shrink-0 items-center justify-center border-r border-white/70 text-[13px] font-medium text-[#596D78] ${dayHeaderColors[dayIndex]}`}
                style={{ width: DAY_WIDTH }}
              >
                {day}
              </div>
              <div className="relative flex" style={{ width: timeWidth }}>
                {hours.map((hour, index) => (
                  <div key={hour} aria-hidden="true" className={`h-full shrink-0 border-r border-[#EEE4E8] ${index % 2 === 0 ? "bg-[#FFFEFC]" : "bg-white"}`} style={{ width: HOUR_WIDTH }} />
                ))}
                {items.filter((item) => item.schedule_day === dayIndex + 1).map((item) => {
                  const style = getBlockPosition(item, startHour, endHour);
                  return style ? <ScheduleBlock key={item.display_id} item={item} style={style} onClick={() => onSelect(item)} /> : null;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
