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
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, X } from "lucide-react";

type PickerType = "date" | "time" | "datetime-local";
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { type: PickerType };

const pad = (value: number) => String(value).padStart(2, "0");
const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const weekdays = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const toDateValue = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseDate = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
};
const parseTime = (value: string) => {
  const match = value.match(/(?:T|^)(\d{2}):(\d{2})/);
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
};
const display = (type: PickerType, value: string) => {
  if (!value) return type === "date" ? "dd/mm/yyyy" : type === "time" ? "--:--" : "dd/mm/yyyy --:--";
  if (type === "time") return value.slice(0, 5);
  const date = parseDate(value);
  const dateText = date ? `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}` : "dd/mm/yyyy";
  return type === "date" ? dateText : `${dateText} ${value.slice(11, 16)}`;
};
const setForwardedRef = (ref: ForwardedRef<HTMLInputElement>, element: HTMLInputElement | null) => {
  if (typeof ref === "function") ref(element);
  else if (ref) ref.current = element;
};

const LocalizedDateTimeInput = forwardRef<HTMLInputElement, Props>(function LocalizedDateTimeInput(
  { type, value, defaultValue, onChange, className = "", disabled, min, max, id, name, required, "aria-label": ariaLabel },
  ref
) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [internal, setInternal] = useState(typeof defaultValue === "string" ? defaultValue : "");
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date());
  const [month, setMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [hour, setHour] = useState(new Date().getHours());
  const [minute, setMinute] = useState(new Date().getMinutes());
  const controlled = typeof value === "string";
  const current = controlled ? value : internal;
  const hasDate = type !== "time";
  const hasTime = type !== "date";
  const accent = type === "date" ? "#F080A7" : "#74B88A";
  const Icon = type === "time" ? Clock3 : CalendarDays;

  const emit = (next: string) => {
    if (!controlled) setInternal(next);
    if (inputRef.current) inputRef.current.value = next;
    onChange?.({ target: { value: next }, currentTarget: { value: next } } as ChangeEvent<HTMLInputElement>);
  };

  const show = () => {
    if (disabled || !triggerRef.current) return;
    const now = new Date();
    const initialDate = parseDate(current) ?? now;
    const initialTime = parseTime(current) ?? { hour: now.getHours(), minute: now.getMinutes() };
    setDate(initialDate);
    setMonth(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
    setHour(initialTime.hour);
    setMinute(initialTime.minute);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const confirm = () => {
    emit(type === "date" ? toDateValue(date) : type === "time" ? `${pad(hour)}:${pad(minute)}` : `${toDateValue(date)}T${pad(hour)}:${pad(minute)}`);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={show}
        aria-label={ariaLabel ?? (type === "date" ? "เลือกวันที่" : type === "time" ? "เลือกเวลา" : "เลือกวันและเวลา")}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`!flex cursor-pointer items-center gap-2 ${className}`}
      >
        <span className={`min-w-0 flex-1 truncate text-left ${current ? "text-inherit" : "text-[#657983]"}`}>{display(type, current)}</span>
        <Icon size={17} style={{ color: accent }} className="shrink-0" />
      </button>
      <input ref={(element) => { inputRef.current = element; setForwardedRef(ref, element); }} id={id} name={name} type="hidden" value={current} required={required} readOnly />

      {open && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[2147483647] flex items-center justify-center overflow-y-auto bg-transparent p-3 backdrop-blur-[1px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
        <div
          role="dialog"
          aria-modal="true"
          className={`relative max-h-[calc(100dvh-24px)] overflow-y-auto rounded-[22px] border bg-[#FFFDFB] p-4 shadow-[0_18px_55px_rgba(65,72,78,0.24)] ${type === "datetime-local" ? "w-[min(550px,calc(100vw-24px))]" : hasDate ? "w-[min(330px,calc(100vw-24px))]" : "w-[min(270px,calc(100vw-24px))]"}`}
          style={{ borderColor: `${accent}66` }}
        >
          <div className="mb-3 flex items-center gap-2 font-semibold text-[#374957]">
            <Icon size={18} style={{ color: accent }} />
            <span className="flex-1">{type === "date" ? "เลือกวันที่" : type === "time" ? "เลือกเวลา" : "เลือกวันและเวลา"}</span>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1.5 text-[#839198] hover:bg-[#F2F5F6]" aria-label="ปิด"><X size={17} /></button>
          </div>
          <div className={type === "datetime-local" ? "grid gap-4 sm:grid-cols-[1fr_190px]" : ""}>
            {hasDate && <Calendar date={date} month={month} min={typeof min === "string" ? parseDate(min) : null} max={typeof max === "string" ? parseDate(max) : null} accent={accent} onDate={setDate} onMonth={setMonth} />}
            {hasTime && <Time hour={hour} minute={minute} accent={accent} onHour={setHour} onMinute={setMinute} />}
          </div>
          <div className="mt-4 flex justify-between border-t border-[#E9EFF1] pt-3">
            <button type="button" onClick={() => { emit(""); setOpen(false); }} className="rounded-full px-3 py-1.5 text-xs font-semibold text-[#788991] hover:bg-[#F1F5F6]">ล้างค่า</button>
            <button type="button" onClick={confirm} className="rounded-full px-5 py-2 text-sm font-semibold text-white" style={{ backgroundColor: accent }}>ตกลง</button>
          </div>
        </div>
        </div>, document.body
      )}
    </>
  );
});

function Calendar({ date, month, min, max, accent, onDate, onMonth }: { date: Date; month: Date; min: Date | null; max: Date | null; accent: string; onDate: (date: Date) => void; onMonth: (date: Date) => void }) {
  const offset = month.getDay();
  const first = new Date(month.getFullYear(), month.getMonth(), 1 - offset);
  const days = Array.from({ length: 42 }, (_, index) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + index));
  const todayYear = new Date().getFullYear();
  const firstYear = Math.min(min?.getFullYear() ?? todayYear - 100, month.getFullYear());
  const lastYear = Math.max(max?.getFullYear() ?? todayYear + 20, month.getFullYear());
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index);
  const previousMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const canGoPrevious = month.getMonth() > 0 && (!min || new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0) >= min);
  const canGoNext = month.getMonth() < 11 && (!max || nextMonth <= max);

  const selectYear = (year: number) => {
    let selectedMonth = month.getMonth();
    if (min?.getFullYear() === year) selectedMonth = Math.max(selectedMonth, min.getMonth());
    if (max?.getFullYear() === year) selectedMonth = Math.min(selectedMonth, max.getMonth());
    const lastDay = new Date(year, selectedMonth + 1, 0).getDate();
    let nextDate = new Date(year, selectedMonth, Math.min(date.getDate(), lastDay));
    if (min && nextDate < min) nextDate = new Date(min);
    if (max && nextDate > max) nextDate = new Date(max);
    onMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    onDate(nextDate);
  };

  return <div>
    <div className="mb-2 grid grid-cols-[32px_minmax(84px,1fr)_32px_92px] items-center gap-1">
      <button type="button" disabled={!canGoPrevious} onClick={() => onMonth(previousMonth)} className="rounded-full p-1.5 text-[#637985] hover:bg-[#EEF5F7] disabled:cursor-not-allowed disabled:opacity-25" aria-label="เดือนก่อนหน้า"><ChevronLeft size={18} /></button>
      <span className="text-center text-sm font-semibold text-[#405762]">{months[month.getMonth()]}</span>
      <button type="button" disabled={!canGoNext} onClick={() => onMonth(nextMonth)} className="rounded-full p-1.5 text-[#637985] hover:bg-[#EEF5F7] disabled:cursor-not-allowed disabled:opacity-25" aria-label="เดือนถัดไป"><ChevronRight size={18} /></button>
      <label>
        <span className="sr-only">เลือกปี</span>
        <select aria-label="เลือกปี" value={month.getFullYear()} onChange={(event) => selectYear(Number(event.target.value))} className="h-8 w-full rounded-xl border border-[#D7E5EA] bg-white px-2 text-xs font-semibold text-[#405762] outline-none focus:border-[#82C9EA]">
          {years.map((year) => <option key={year} value={year}>ปี {year}</option>)}
        </select>
      </label>
    </div>
    <div className="grid grid-cols-7 gap-1 text-center">
      {weekdays.map((day) => <span key={day} className="py-1 text-[10px] font-semibold text-[#91A0A7]">{day}</span>)}
      {days.map((item) => {
        const outside = item.getMonth() !== month.getMonth();
        const selected = toDateValue(item) === toDateValue(date);
        const unavailable = outside || (min && item < min) || (max && item > max);
        return <button key={toDateValue(item)} type="button" disabled={Boolean(unavailable)} onClick={() => onDate(item)} className={`aspect-square rounded-full text-xs ${outside ? "text-[#B9C3C7]" : "text-[#405762]"} disabled:opacity-25`} style={selected ? { backgroundColor: accent, color: "white" } : undefined}>{item.getDate()}</button>;
      })}
    </div>
  </div>;
}

function Time({ hour, minute, accent, onHour, onMinute }: { hour: number; minute: number; accent: string; onHour: (value: number) => void; onMinute: (value: number) => void }) {
  return <div>
    <div className="mb-2 rounded-2xl bg-[#EFF8F1] py-2 text-center text-xl font-semibold text-[#385B44]"><Clock3 size={17} style={{ color: accent }} className="mr-1 inline" />{pad(hour)}:{pad(minute)}</div>
    <div className="grid grid-cols-2 gap-2">
      <Numbers count={24} value={hour} accent={accent} label="ชั่วโมง" onChange={onHour} />
      <Numbers count={60} value={minute} accent={accent} label="นาที" onChange={onMinute} />
    </div>
  </div>;
}

function Numbers({ count, value, accent, label, onChange }: { count: number; value: number; accent: string; label: string; onChange: (value: number) => void }) {
  return <div><p className="mb-1 text-center text-[10px] text-[#84959D]">{label}</p><div className="h-44 overflow-y-auto rounded-xl border border-[#DCE7E1] bg-white p-1 [scrollbar-width:thin]">{Array.from({ length: count }, (_, item) => <button key={item} type="button" onClick={() => onChange(item)} className="mb-1 block w-full rounded-lg py-1 text-center text-xs text-[#405762]" style={item === value ? { backgroundColor: `${accent}2E`, fontWeight: 700 } : undefined}>{pad(item)}</button>)}</div></div>;
}

export const DatePickerInput = forwardRef<HTMLInputElement, Omit<Props, "type">>((props, ref) => (
  <LocalizedDateTimeInput {...props} ref={ref} type="date" />
));
DatePickerInput.displayName = "DatePickerInput";

export const TimePickerInput = forwardRef<HTMLInputElement, Omit<Props, "type">>((props, ref) => (
  <LocalizedDateTimeInput {...props} ref={ref} type="time" />
));
TimePickerInput.displayName = "TimePickerInput";

export const DateTimePickerInput = forwardRef<HTMLInputElement, Omit<Props, "type">>((props, ref) => (
  <LocalizedDateTimeInput {...props} ref={ref} type="datetime-local" />
));
DateTimePickerInput.displayName = "DateTimePickerInput";

export default LocalizedDateTimeInput;
