"use client";

import TimePicker24Hour from "@/components/common/TimePicker24Hour";

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
  const id = `schedule-time-${label === "เวลาเริ่ม" ? "start" : "end"}`;
  const borderColor = isInvalid
    ? "border-[#E79A9F] focus-within:border-[#D65D69] focus-within:ring-[#F8D9DC]"
    : "border-[#A9C8D6] focus-within:border-[#6AAAC7] focus-within:ring-[#DCEFF7]";

  return (
    <label className="min-w-0">
      <span className="mb-1 block text-[10px] text-[#78909C]">{label}</span>
      <TimePicker24Hour
        id={id}
        value={value}
        onChange={onChange}
        ariaLabel={`${label} รูปแบบ 24 ชั่วโมง`}
        ariaInvalid={isInvalid}
        className={`h-10 min-w-0 rounded-xl border bg-gradient-to-b from-white to-[#F2FAFD] px-2 text-center text-[13px] font-medium text-[#4D6570] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition focus-within:ring-2 ${borderColor}`}
        iconClassName="text-[#6AAAC7]"
        iconSize={15}
      />
    </label>
  );
}
