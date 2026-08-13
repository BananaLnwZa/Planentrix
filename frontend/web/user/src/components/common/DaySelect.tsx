"use client";

import CustomSelect, { type CustomSelectOption } from "./CustomSelect";

const dayColors = [
  ["!bg-[#FFFDF0] !text-[#B99D00]", "!bg-[#FFFDF0] !text-[#B99D00]"],
  ["!bg-[#FFF5F8] !text-[#D86F95]", "!bg-[#FFF5F8] !text-[#D86F95]"],
  ["!bg-[#F7FDED] !text-[#6FA844]", "!bg-[#F7FDED] !text-[#6FA844]"],
  ["!bg-[#FFF7F1] !text-[#D97D3E]", "!bg-[#FFF7F1] !text-[#D97D3E]"],
  ["!bg-[#FBF6FE] !text-[#AE79C8]", "!bg-[#FBF6FE] !text-[#AE79C8]"],
  ["!bg-[#F2FAFE] !text-[#4A9BCD]", "!bg-[#F2FAFE] !text-[#4A9BCD]"],
  ["!bg-[#FFF5F4] !text-[#DF6259]", "!bg-[#FFF5F4] !text-[#DF6259]"],
] as const;

const dayLabels = {
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  th: ["วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์", "วันอาทิตย์"],
};

export default function DaySelect({
  value,
  onChange,
  locale = "th",
  placeholder,
  disabled = false,
  allowEmpty = false,
  id,
  className = "",
  compact = false,
  ariaLabel,
}: {
  value: number | "" | null;
  onChange: (day: number | null) => void;
  locale?: "en" | "th";
  placeholder?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
  id?: string;
  className?: string;
  compact?: boolean;
  ariaLabel?: string;
}) {
  const dayOptions: CustomSelectOption<number>[] = dayLabels[locale].map(
    (label, index) => ({
      value: index + 1,
      label,
      activeClassName: dayColors[index][0],
      selectedClassName: dayColors[index][1],
    })
  );
  const options: CustomSelectOption<number>[] = allowEmpty
    ? [{ value: 0, label: "ไม่ระบุ" }, ...dayOptions]
    : dayOptions;

  return (
    <CustomSelect
      id={id}
      value={value}
      options={options}
      onChange={(day) => onChange(day === 0 ? null : day)}
      placeholder={placeholder ?? (allowEmpty ? "ไม่ระบุ" : locale === "th" ? "เลือกวัน" : "Select day")}
      disabled={disabled}
      compact={compact}
      className={className}
      ariaLabel={ariaLabel}
      maxMenuHeight={360}
    />
  );
}
