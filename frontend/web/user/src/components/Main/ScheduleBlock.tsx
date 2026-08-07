import type { CSSProperties } from "react";
import type { ScheduleItem } from "@/interfaces/table.interface";

const scheduleTypeStyles = {
  1: {
    block:
      "border-[#A7D286] bg-gradient-to-br from-[#EFF9E6] to-[#DDF1C9] text-[#4E713A] hover:from-[#E6F5D8] hover:to-[#D2EABC]",
    dot: "bg-[#8FC56A]",
  },
  2: {
    block:
      "border-[#E7C96E] bg-gradient-to-br from-[#FFF8DE] to-[#FFF0BA] text-[#806720] hover:from-[#FFF3CA] hover:to-[#FFE9A2]",
    dot: "bg-[#E6BE4D]",
  },
  3: {
    block:
      "border-[#E7AAA4] bg-gradient-to-br from-[#FDE8E5] to-[#F8D1CD] text-[#8A4B46] hover:from-[#F9DBD7] hover:to-[#F3C1BC]",
    dot: "bg-[#DF8E86]",
  },
} as const;

export default function ScheduleBlock({
  item,
  style,
  onClick,
}: {
  item: ScheduleItem;
  style: CSSProperties;
  onClick: () => void;
}) {
  const typeStyle = scheduleTypeStyles[item.schedule_type_id];

  return (
    <button
      type="button"
      style={style}
      onClick={onClick}
      aria-label={`${item.subject_name} เวลา ${item.start_time} ถึง ${item.end_time}`}
      className={`absolute left-1 right-1 z-[2] overflow-hidden rounded-[10px] border px-1.5 py-1 text-left shadow-[0_2px_5px_rgba(91,107,113,0.15),inset_0_1px_0_rgba(255,255,255,0.7)] transition-all hover:z-[3] hover:-translate-y-0.5 hover:shadow-[0_4px_9px_rgba(91,107,113,0.2)] focus-visible:z-[4] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#5B8CA5] ${typeStyle.block}`}
    >
      <span
        aria-hidden="true"
        className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ring-2 ring-white/55 ${typeStyle.dot}`}
      />
      <span className="line-clamp-2 break-words pr-2 text-[11px] font-semibold leading-tight">
        {item.subject_name}
      </span>
      {item.classroom && (
        <span className="mt-0.5 block truncate text-[9px] leading-tight opacity-80">
          ห้อง {item.classroom}
        </span>
      )}
      <span className="mt-1 block whitespace-nowrap text-[9px] leading-none opacity-90">
        {item.start_time}–{item.end_time}
      </span>
    </button>
  );
}
