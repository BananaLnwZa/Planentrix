import type { ScheduleItem } from "@/interfaces/table.interface";
import ScheduleBlock from "./ScheduleBlock";

const scheduleDays = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
const dayHeaderColors = [
  "bg-[#FFF0B8]",
  "bg-[#FFD7E5]",
  "bg-[#DDF0C7]",
  "bg-[#FFE0C9]",
  "bg-[#D6EBFA]",
  "bg-[#DDDDF8]",
  "bg-[#F8D1CD]",
];

const START_HOUR = 6;
const END_HOUR = 24;
const ROW_HEIGHT = 38;
const hours = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, index) => START_HOUR + index
);

function formatHour(hour: number) {
  if (hour === 12) return "12 PM";
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function getBlockPosition(item: ScheduleItem) {
  const gridStart = START_HOUR * 60;
  const gridEnd = END_HOUR * 60;
  const start = Math.max(gridStart, timeToMinutes(item.start_time));
  const end = Math.min(gridEnd, timeToMinutes(item.end_time));

  return {
    top: ((start - gridStart) / 60) * ROW_HEIGHT + 2,
    height: Math.max(((end - start) / 60) * ROW_HEIGHT - 4, 32),
  };
}

export default function ScheduleGrid({
  items,
  onSelect,
}: {
  items: ScheduleItem[];
  onSelect: (item: ScheduleItem) => void;
}) {
  const gridHeight = hours.length * ROW_HEIGHT;

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-[14px] [scrollbar-gutter:stable]">
      <div
        className="min-w-[620px] text-[#52636D]"
        style={{ fontFamily: "var(--font-sansation)" }}
      >
        <div className="sticky top-0 z-10 grid grid-cols-[54px_repeat(7,minmax(0,1fr))] overflow-hidden rounded-t-[14px] bg-white shadow-[0_2px_7px_rgba(104,79,89,0.14)]">
          <div className="flex h-10 items-center justify-center border-r border-[#E2C7D1] bg-[#FFFFFF] text-[13px] text-[#426477]">
            เวลา
          </div>
          {scheduleDays.map((day, index) => (
            <div
              key={day}
              className={`flex h-10 items-center justify-center text-[13px] font-medium text-[#596D78] [text-shadow:1px_1px_0_rgba(255,255,255,0.85)] ${dayHeaderColors[index]} ${index < scheduleDays.length - 1 ? "border-r border-white/50" : ""}`}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="flex overflow-hidden rounded-b-xl border border-t-0 border-[#DECBD2] bg-white shadow-[0_3px_6px_rgba(104,79,89,0.14)]">
          <div className="w-[54px] shrink-0 border-r border-[#E5D4DA]">
            {hours.map((hour, index) => (
              <div
                key={hour}
                className={`flex h-[38px] items-start justify-center border-b border-[#EEE1E6] pt-1 text-[10px] text-[#687983] ${index % 2 === 0 ? "bg-[#FFF1D5]" : "bg-[#FFF7E8]"}`}
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>

          <div
            className="grid min-w-0 flex-1 grid-cols-7"
            style={{ height: gridHeight }}
          >
            {scheduleDays.map((day, dayIndex) => (
              <div
                key={day}
                className={`relative ${dayIndex < scheduleDays.length - 1 ? "border-r border-[#EEE4E8]" : ""}`}
              >
                {hours.map((hour, rowIndex) => (
                  <div
                    key={hour}
                    aria-hidden="true"
                    className={`h-[38px] border-b border-[#EEE1E6] ${rowIndex % 2 === 0 ? "bg-[#FFFEFC]" : "bg-white"}`}
                  />
                ))}

                {items
                  .filter((item) => item.schedule_day === dayIndex + 1)
                  .map((item) => (
                    <ScheduleBlock
                      key={item.schedule_time_id}
                      item={item}
                      style={getBlockPosition(item)}
                      onClick={() => onSelect(item)}
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
