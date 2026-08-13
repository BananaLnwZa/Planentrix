"use client";

import LocalizedDateTimeInput from "./LocalizedDateTimeInput";

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
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  className?: string;
  iconClassName?: string;
  iconSize?: number;
}) {
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
