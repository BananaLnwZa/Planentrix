"use client";

import CustomSelect, { type CustomSelectOption } from "./CustomSelect";

export type GenderValue = "male" | "female" | "other";

const genderColors: Record<
  GenderValue,
  { active: string; selected: string }
> = {
  male: {
    active: "!bg-[#F4FAFD] !text-[#73B6DD]",
    selected: "!bg-[#F4FAFD] !text-[#73B6DD]",
  },
  female: {
    active: "!bg-[#FEF7F9] !text-[#DE7898]",
    selected: "!bg-[#FEF7F9] !text-[#DE7898]",
  },
  other: {
    active: "!bg-[#FAF7FC] !text-[#AE79C8]",
    selected: "!bg-[#FAF7FC] !text-[#AE79C8]",
  },
};

export default function GenderSelect({
  value,
  onChange,
  disabled = false,
  locale = "en",
  label = "gender",
  id,
  className = "",
  compact = false,
}: {
  value?: GenderValue | "" | null;
  onChange: (gender: GenderValue) => void;
  disabled?: boolean;
  locale?: "en" | "th";
  label?: string | null;
  id?: string;
  className?: string;
  compact?: boolean;
}) {
  const labels: Record<GenderValue, string> = locale === "th"
    ? { male: "ชาย", female: "หญิง", other: "อื่น ๆ" }
    : { male: "Male", female: "Female", other: "Other" };
  const options = (Object.keys(labels) as GenderValue[]).map(
    (gender): CustomSelectOption<GenderValue> => ({
      value: gender,
      label: labels[gender],
      activeClassName: genderColors[gender].active,
      selectedClassName: genderColors[gender].selected,
    })
  );

  return (
    <div className={className}>
      {label && <label htmlFor={id} className="mb-2 block text-xs text-gray-700 sm:text-sm">{label}</label>}
      <CustomSelect
        id={id}
        value={value}
        options={options}
        onChange={onChange}
        placeholder={locale === "th" ? "เลือกเพศ" : "select gender"}
        disabled={disabled}
        compact={compact}
      />
    </div>
  );
}
