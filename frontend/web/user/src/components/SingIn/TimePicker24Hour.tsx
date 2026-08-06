"use client";

import { useEffect, useRef } from "react";
import { Clock } from "lucide-react";

const hourOptions = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0")
);
const minuteOptions = Array.from({ length: 60 }, (_, minute) =>
  String(minute).padStart(2, "0")
);

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
  iconClassName = "text-[#86B96B]",
  iconSize = 20,
}: TimePicker24HourProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [hour = "00", minute = "00"] = value.split(":");

  useEffect(() => {
    const closePicker = (event: PointerEvent) => {
      const details = detailsRef.current;
      if (details?.open && !details.contains(event.target as Node)) {
        details.open = false;
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && detailsRef.current) {
        detailsRef.current.open = false;
      }
    };

    document.addEventListener("pointerdown", closePicker);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closePicker);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const ensureInitialValue = () => {
    if (!value) onChange("00:00");
  };

  return (
    <details ref={detailsRef} className="relative w-full" onToggle={ensureInitialValue}>
      <summary
        id={id}
        aria-label={`${ariaLabel} รูปแบบ 24 ชั่วโมง`}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={`relative flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden ${className}`}
      >
        <span>{value || "00:00"}</span>
        <Clock
          aria-hidden="true"
          size={iconSize}
          strokeWidth={2.2}
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${iconClassName}`}
        />
      </summary>

      <div className="absolute left-0 top-full z-[60] mt-2 w-[190px] rounded-2xl border border-[#B9D9A0] bg-white p-3 shadow-[0_8px_20px_rgba(75,93,80,0.2)]">
        <p className="mb-2 text-center text-[11px] text-[#6F8068]">
          เวลาแบบ 24 ชั่วโมง
        </p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
          <label>
            <span className="sr-only">ชั่วโมง</span>
            <select
              value={hour}
              onChange={(event) => onChange(`${event.target.value}:${minute}`)}
              className="h-9 w-full rounded-xl border border-[#C8DDB8] bg-[#F7FCF3] px-2 text-center text-sm text-[#50604A] outline-none focus:border-[#86B96B]"
            >
              {hourOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <span className="font-semibold text-[#86A276]">:</span>
          <label>
            <span className="sr-only">นาที</span>
            <select
              value={minute}
              onChange={(event) => onChange(`${hour}:${event.target.value}`)}
              className="h-9 w-full rounded-xl border border-[#C8DDB8] bg-[#F7FCF3] px-2 text-center text-sm text-[#50604A] outline-none focus:border-[#86B96B]"
            >
              {minuteOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={() => {
            if (detailsRef.current) detailsRef.current.open = false;
          }}
          className="mt-3 h-8 w-full rounded-full bg-[#B5E48C] text-xs text-[#46603C] transition hover:bg-[#A7D77F]"
        >
          ตกลง
        </button>
      </div>
    </details>
  );
}
