"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ForwardedRef,
  type InputHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  X,
} from "lucide-react";

export type PickerType = "date" | "time" | "datetime-local";

export type LocalizedDateTimeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  type: PickerType;
  iconSize?: number;
  iconClassName?: string;
};

const pad2 = (value: number) => String(value).padStart(2, "0");
const monthNames = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const dayNames = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

const datePart = (value: Date) =>
  `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;

const parseDatePart = (value?: string | null) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseTimePart = (value?: string | null) => {
  const match = value?.match(/(?:T|^)(\d{2}):(\d{2})/);
  return match
    ? { hour: Number(match[1]), minute: Number(match[2]) }
    : null;
};

const displayValue = (type: PickerType, value: string) => {
  if (!value) {
    if (type === "date") return "dd/mm/yyyy";
    if (type === "time") return "--:--";
    return "dd/mm/yyyy --:--";
  }
  if (type === "time") return value.slice(0, 5);
  const parsed = parseDatePart(value);
  const date = parsed
    ? `${pad2(parsed.getDate())}/${pad2(parsed.getMonth() + 1)}/${parsed.getFullYear()}`
    : "dd/mm/yyyy";
  return type === "datetime-local"
    ? `${date} ${parseTimePart(value) ? value.slice(11, 16) : "--:--"}`
    : date;
};

const assignRef = (
  ref: ForwardedRef<HTMLInputElement>,
  value: HTMLInputElement | null
) => {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
};

const sameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const LocalizedDateTimeInput = forwardRef<
  HTMLInputElement,
  LocalizedDateTimeInputProps
>(function LocalizedDateTimeInput(
  {
    type,
    value,
    defaultValue,
    onChange,
    className = "",
    iconSize,
    iconClassName = "",
    disabled,
    min,
    max,
    id,
    name,
    required,
    "aria-label": ariaLabel,
  },
  ref
) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [internalValue, setInternalValue] = useState(
    typeof defaultValue === "string" ? defaultValue : ""
  );
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [hour, setHour] = useState(new Date().getHours());
  const [minute, setMinute] = useState(new Date().getMinutes());

  const controlled = typeof value === "string";
  const stringValue = controlled ? value : internalValue;
  const hasDate = type !== "time";
  const hasTime = type !== "date";
  const Icon = type === "time" ? Clock3 : CalendarDays;
  const accent = type === "date" ? "#F080A7" : "#74B88A";

  const emitValue = (nextValue: string) => {
    if (!controlled) setInternalValue(nextValue);
    if (inputRef.current) inputRef.current.value = nextValue;
    onChange?.({
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    } as ChangeEvent<HTMLInputElement>);
  };

  const syncDraft = () => {
    const now = new Date();
    const parsedDate = parseDatePart(stringValue) ?? now;
    const parsedTime = parseTimePart(stringValue) ?? {
      hour: now.getHours(),
      minute: now.getMinutes(),
    };
    setSelectedDate(parsedDate);
    setVisibleMonth(new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1));
    setHour(parsedTime.hour);
    setMinute(parsedTime.minute);
  };

  const openPicker = () => {
    if (disabled || !triggerRef.current) return;
    syncDraft();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!document.getElementById(`${id ?? name ?? "picker"}-popover`)?.contains(target) &&
          !triggerRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [id, name, open]);

  const confirm = () => {
    if (type === "date") emitValue(datePart(selectedDate));
    else if (type === "time") emitValue(`${pad2(hour)}:${pad2(minute)}`);
    else emitValue(`${datePart(selectedDate)}T${pad2(hour)}:${pad2(minute)}`);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel ?? (type === "date" ? "เลือกวันที่" : type === "time" ? "เลือกเวลา" : "เลือกวันและเวลา")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openPicker}
        className={`relative !flex items-center gap-2 overflow-hidden focus-visible:ring-2 focus-visible:ring-[#82C9EA]/30 ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        } ${className}`}
      >
        <span className={`min-w-0 flex-1 truncate text-left ${stringValue ? "text-inherit" : "text-[#657983]"}`}>
          {displayValue(type, stringValue)}
        </span>
        <Icon
          aria-hidden="true"
          size={iconSize ?? (type === "time" ? 22 : 17)}
          style={{ color: accent }}
          className={`shrink-0 ${iconClassName}`}
        />
      </button>

      <input
        ref={(element) => {
          inputRef.current = element;
          assignRef(ref, element);
        }}
        id={id}
        name={name}
        type="hidden"
        value={stringValue}
        required={required}
        readOnly
      />

      {open && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[2147483647] flex items-center justify-center overflow-y-auto bg-transparent p-3 backdrop-blur-[1px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
        <div
          id={`${id ?? name ?? "picker"}-popover`}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          className={`relative max-h-[calc(100dvh-24px)] overflow-y-auto rounded-[22px] border bg-[#FFFDFB] p-4 shadow-[0_18px_55px_rgba(65,72,78,0.24)] ${
            type === "datetime-local" ? "w-[min(560px,calc(100vw-24px))]" : hasDate ? "w-[min(330px,calc(100vw-24px))]" : "w-[min(270px,calc(100vw-24px))]"
          }`}
          style={{ borderColor: `${accent}66` }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-[#374957]">
              <Icon size={18} style={{ color: accent }} />
              {type === "date" ? "เลือกวันที่" : type === "time" ? "เลือกเวลา" : "เลือกวันและเวลา"}
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1.5 text-[#839198] hover:bg-[#F2F5F6]" aria-label="ปิด">
              <X size={17} />
            </button>
          </div>

          <div className={type === "datetime-local" ? "grid gap-4 sm:grid-cols-[1fr_190px]" : ""}>
            {hasDate && (
              <CalendarPanel
                accent={accent}
                selectedDate={selectedDate}
                visibleMonth={visibleMonth}
                min={typeof min === "string" ? parseDatePart(min) : null}
                max={typeof max === "string" ? parseDatePart(max) : null}
                onMonthChange={setVisibleMonth}
                onSelect={setSelectedDate}
              />
            )}
            {hasTime && (
              <TimePanel
                accent={accent}
                hour={hour}
                minute={minute}
                onHourChange={setHour}
                onMinuteChange={setMinute}
              />
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#E9EFF1] pt-3">
            <button type="button" onClick={() => { emitValue(""); setOpen(false); }} className="rounded-full px-3 py-1.5 text-xs font-semibold text-[#788991] hover:bg-[#F1F5F6]">
              ล้างค่า
            </button>
            <button type="button" onClick={confirm} className="rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm" style={{ backgroundColor: accent }}>
              ตกลง
            </button>
          </div>
        </div>
        </div>,
        document.body
      )}
    </>
  );
});

function CalendarPanel({
  accent,
  selectedDate,
  visibleMonth,
  min,
  max,
  onMonthChange,
  onSelect,
}: {
  accent: string;
  selectedDate: Date;
  visibleMonth: Date;
  min: Date | null;
  max: Date | null;
  onMonthChange: (value: Date) => void;
  onSelect: (value: Date) => void;
}) {
  const firstOffset = visibleMonth.getDay();
  const firstCell = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1 - firstOffset);
  const days = Array.from({ length: 42 }, (_, index) =>
    new Date(firstCell.getFullYear(), firstCell.getMonth(), firstCell.getDate() + index)
  );
  const todayYear = new Date().getFullYear();
  const firstYear = Math.min(min?.getFullYear() ?? todayYear - 100, visibleMonth.getFullYear());
  const lastYear = Math.max(max?.getFullYear() ?? todayYear + 20, visibleMonth.getFullYear());
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index);
  const previousMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  const canGoPrevious =
    visibleMonth.getMonth() > 0 &&
    (!min || new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0) >= min);
  const canGoNext =
    visibleMonth.getMonth() < 11 && (!max || nextMonth <= max);

  const selectYear = (year: number) => {
    let month = visibleMonth.getMonth();
    if (min?.getFullYear() === year) month = Math.max(month, min.getMonth());
    if (max?.getFullYear() === year) month = Math.min(month, max.getMonth());
    const lastDay = new Date(year, month + 1, 0).getDate();
    let nextDate = new Date(year, month, Math.min(selectedDate.getDate(), lastDay));
    if (min && nextDate < min) nextDate = new Date(min);
    if (max && nextDate > max) nextDate = new Date(max);
    onMonthChange(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    onSelect(nextDate);
  };

  return (
    <div>
      <div className="mb-2 grid grid-cols-[32px_minmax(84px,1fr)_32px_92px] items-center gap-1">
        <button type="button" disabled={!canGoPrevious} onClick={() => onMonthChange(previousMonth)} className="rounded-full p-1.5 text-[#637985] hover:bg-[#EEF5F7] disabled:cursor-not-allowed disabled:opacity-25" aria-label="เดือนก่อนหน้า">
          <ChevronLeft size={18} />
        </button>
        <span className="text-center text-sm font-semibold text-[#405762]">{monthNames[visibleMonth.getMonth()]}</span>
        <button type="button" disabled={!canGoNext} onClick={() => onMonthChange(nextMonth)} className="rounded-full p-1.5 text-[#637985] hover:bg-[#EEF5F7] disabled:cursor-not-allowed disabled:opacity-25" aria-label="เดือนถัดไป">
          <ChevronRight size={18} />
        </button>
        <label>
          <span className="sr-only">เลือกปี</span>
          <select
            aria-label="เลือกปี"
            value={visibleMonth.getFullYear()}
            onChange={(event) => selectYear(Number(event.target.value))}
            className="h-8 w-full rounded-xl border border-[#D7E5EA] bg-white px-2 text-xs font-semibold text-[#405762] outline-none focus:border-[#82C9EA]"
          >
            {years.map((year) => <option key={year} value={year}>ปี {year}</option>)}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {dayNames.map((day) => <span key={day} className="py-1 text-[10px] font-semibold text-[#91A0A7]">{day}</span>)}
        {days.map((day) => {
          const outside = day.getMonth() !== visibleMonth.getMonth();
          const disabled = outside || (min && day < min) || (max && day > max);
          const selected = sameDay(day, selectedDate);
          return (
            <button
              key={datePart(day)}
              type="button"
              disabled={Boolean(disabled)}
              onClick={() => onSelect(day)}
              className={`aspect-square rounded-full text-xs transition ${outside ? "text-[#B9C3C7]" : "text-[#405762]"} disabled:cursor-not-allowed disabled:opacity-25`}
              style={selected ? { backgroundColor: accent, color: "white" } : undefined}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimePanel({ accent, hour, minute, onHourChange, onMinuteChange }: {
  accent: string;
  hour: number;
  minute: number;
  onHourChange: (value: number) => void;
  onMinuteChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-center gap-2 rounded-2xl bg-[#EFF8F1] py-2 text-xl font-semibold text-[#385B44]">
        <Clock3 size={18} style={{ color: accent }} /> {pad2(hour)}:{pad2(minute)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TimeColumn label="ชั่วโมง" values={24} selected={hour} accent={accent} onSelect={onHourChange} />
        <TimeColumn label="นาที" values={60} selected={minute} accent={accent} onSelect={onMinuteChange} />
      </div>
    </div>
  );
}

function TimeColumn({ label, values, selected, accent, onSelect }: {
  label: string;
  values: number;
  selected: number;
  accent: string;
  onSelect: (value: number) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-center text-[10px] font-semibold text-[#84959D]">{label}</p>
      <div className="h-44 space-y-1 overflow-y-auto rounded-xl border border-[#DCE7E1] bg-white p-1 [scrollbar-width:thin]">
        {Array.from({ length: values }, (_, value) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className="block w-full rounded-lg py-1 text-center text-xs text-[#405762]"
            style={value === selected ? { backgroundColor: `${accent}2E`, color: "#285138", fontWeight: 700 } : undefined}
          >
            {pad2(value)}
          </button>
        ))}
      </div>
    </div>
  );
}

export const DatePickerInput = forwardRef<HTMLInputElement, Omit<LocalizedDateTimeInputProps, "type">>((props, ref) => (
  <LocalizedDateTimeInput {...props} ref={ref} type="date" />
));
DatePickerInput.displayName = "DatePickerInput";

export const TimePickerInput = forwardRef<HTMLInputElement, Omit<LocalizedDateTimeInputProps, "type">>((props, ref) => (
  <LocalizedDateTimeInput {...props} ref={ref} type="time" />
));
TimePickerInput.displayName = "TimePickerInput";

export const DateTimePickerInput = forwardRef<HTMLInputElement, Omit<LocalizedDateTimeInputProps, "type">>((props, ref) => (
  <LocalizedDateTimeInput {...props} ref={ref} type="datetime-local" />
));
DateTimePickerInput.displayName = "DateTimePickerInput";

export default LocalizedDateTimeInput;
