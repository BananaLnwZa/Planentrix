import { Clock } from "lucide-react";

const hourOptions = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0")
);
const minuteOptions = Array.from({ length: 60 }, (_, minute) =>
  String(minute).padStart(2, "0")
);

export default function ScheduleTimePicker24Hour({
  label,
  value,
  onChange,
  isInvalid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isInvalid: boolean;
}) {
  const [hour = "00", minute = "00"] = value.split(":");
  const borderColor = isInvalid
    ? "border-[#E79A9F] focus-within:border-[#D65D69] focus-within:ring-[#F8D9DC]"
    : "border-[#A9C8D6] focus-within:border-[#6AAAC7] focus-within:ring-[#DCEFF7]";

  return (
    <label className="min-w-0">
      <span className="mb-1 block text-[10px] text-[#78909C]">{label}</span>
      <span
        className={`flex h-10 min-w-0 items-center rounded-xl border bg-gradient-to-b from-white to-[#F2FAFD] px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition focus-within:ring-2 ${borderColor}`}
      >
        <Clock
          aria-hidden="true"
          size={15}
          strokeWidth={2.2}
          className="mr-1.5 shrink-0 text-[#6AAAC7]"
        />
        <select
          aria-label={`${label} ชั่วโมง รูปแบบ 24 ชั่วโมง`}
          value={hour}
          onChange={(event) => onChange(`${event.target.value}:${minute}`)}
          aria-invalid={isInvalid}
          className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent text-center text-[13px] font-medium text-[#4D6570] outline-none"
        >
          {hourOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className="px-0.5 font-semibold text-[#6A8795]">:</span>
        <select
          aria-label={`${label} นาที`}
          value={minute}
          onChange={(event) => onChange(`${hour}:${event.target.value}`)}
          aria-invalid={isInvalid}
          className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent text-center text-[13px] font-medium text-[#4D6570] outline-none"
        >
          {minuteOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
