"use client";

import LocalizedDateTimeInput from "@/components/common/LocalizedDateTimeInput";

type TimePicker24HourProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  className?: string;
  iconClassName?: string;
  iconSize?: number;
};

export default function TimePicker24Hour({
  id,
  value,
  onChange,
  ariaLabel,
  ariaInvalid = false,
  ariaDescribedBy,
  className = "",
  iconClassName,
  iconSize,
}: TimePicker24HourProps) {
  return (
    <LocalizedDateTimeInput
      id={id}
      type="time"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      className={className}
      iconClassName={iconClassName}
      iconSize={iconSize}
    />
  );
}
