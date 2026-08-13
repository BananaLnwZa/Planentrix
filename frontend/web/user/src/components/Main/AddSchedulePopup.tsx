"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, ClipboardPenLine, Plus, X } from "lucide-react";
import CustomSelect from "@/components/common/CustomSelect";
import DaySelect from "@/components/common/DaySelect";
import type {
  AddScheduleRequest,
  ScheduleItem,
  ScheduleSubject,
} from "@/interfaces/table.interface";
import ScheduleTimePicker24Hour from "./ScheduleTimePicker24Hour";

type AddSchedulePopupProps = {
  subjects: ScheduleSubject[];
  scheduleItems: ScheduleItem[];
  isLoadingSubjects: boolean;
  subjectsError: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: AddScheduleRequest) => Promise<void>;
};

export default function AddSchedulePopup({
  subjects,
  scheduleItems,
  isLoadingSubjects,
  subjectsError,
  isSubmitting,
  onClose,
  onSubmit,
}: AddSchedulePopupProps) {
  const [scheduleTypeId, setScheduleTypeId] = useState<2 | 3 | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [scheduleDay, setScheduleDay] = useState(1);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [submitError, setSubmitError] = useState("");

  const hasInvalidTimeRange = startTime >= endTime;
  const conflictingItem = !hasInvalidTimeRange
    ? scheduleItems.find(
        (item) =>
          item.schedule_day === scheduleDay &&
          startTime < item.end_time &&
          endTime > item.start_time
      )
    : undefined;
  const isComplete = Boolean(scheduleTypeId && subjectId && startTime && endTime);
  const canSubmit =
    isComplete &&
    !hasInvalidTimeRange &&
    !conflictingItem &&
    !isLoadingSubjects &&
    !isSubmitting;

  const clearSubmitError = () => setSubmitError("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !scheduleTypeId) return;

    setSubmitError("");
    try {
      await onSubmit({
        schedule_type_id: scheduleTypeId,
        subject_id: subjectId,
        schedule_day: scheduleDay,
        start_time: startTime,
        end_time: endTime,
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "ไม่สามารถเพิ่มบล็อกเวลาได้"
      );
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#38596A]/30 p-4 backdrop-blur-[3px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-schedule-title"
        className="relative max-h-[calc(100vh-32px)] w-full max-w-[430px] overflow-y-auto rounded-[22px] border border-[#A9D5E9] bg-gradient-to-b from-[#F1FAFE] to-white px-5 pb-5 pt-5 shadow-[0_18px_45px_rgba(66,112,134,0.25)] sm:px-6"
        style={{ fontFamily: "var(--font-sansation)" }}
      >
        <span
          aria-hidden="true"
          className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#CDECF9]/65"
        />
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="ปิดแบบฟอร์มเพิ่มบล็อกเวลา"
          className="absolute right-3 top-3 z-10 rounded-full p-1 text-[#5D9AB7] transition hover:bg-[#DFF3FC] disabled:opacity-50"
        >
          <X aria-hidden="true" size={23} strokeWidth={2.8} />
        </button>

        <div className="relative flex items-center gap-3 border-b border-[#D9EBF3] pb-3 pr-8">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#9BCDE3] bg-[#CDECF9] text-[#4F91AF]">
            <Plus aria-hidden="true" size={25} strokeWidth={3} />
          </span>
          <div>
            <h2
              id="add-schedule-title"
              className="text-lg font-semibold text-[#435B66]"
            >
              เพิ่มบล็อกเวลา
            </h2>
            <p className="text-xs text-[#78909C]">
              เพิ่มเวลาอ่านหนังสือหรือทำการบ้าน
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative mt-4 space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm text-[#536D79]">ประเภทบล็อกเวลา</legend>
            <div className="grid grid-cols-2 gap-2.5">
              <ScheduleTypeOption
                value={2}
                label="อ่านหนังสือ"
                icon={<BookOpen aria-hidden="true" size={18} />}
                selected={scheduleTypeId === 2}
                colorClass="border-[#E8CF7C] bg-[#FFF6D8] text-[#856C29]"
                onSelect={() => {
                  setScheduleTypeId(2);
                  clearSubmitError();
                }}
              />
              <ScheduleTypeOption
                value={3}
                label="การบ้าน"
                icon={<ClipboardPenLine aria-hidden="true" size={18} />}
                selected={scheduleTypeId === 3}
                colorClass="border-[#E9B1AC] bg-[#FCE2DF] text-[#96534D]"
                onSelect={() => {
                  setScheduleTypeId(3);
                  clearSubmitError();
                }}
              />
            </div>
          </fieldset>

          <div className="block">
            <span className="mb-1.5 block text-sm text-[#536D79]">รายวิชา</span>
            <CustomSelect
              required
              value={subjectId}
              disabled={isLoadingSubjects || subjects.length === 0}
              onChange={(value) => {
                setSubjectId(value);
                clearSubmitError();
              }}
              options={subjects.map((subject) => ({
                value: subject.subject_id,
                label: `${subject.subject_id} — ${subject.subject_name}`,
              }))}
              placeholder={
                isLoadingSubjects
                  ? "กำลังโหลดรายวิชา..."
                  : subjects.length
                    ? "เลือกรายวิชา"
                    : "ไม่พบรายวิชาในเทอมปัจจุบัน"
              }
              compact
            />
            {subjectsError && (
              <span className="mt-1.5 block text-xs text-red-500" role="alert">
                {subjectsError}
              </span>
            )}
          </div>

          <div className="block">
            <span className="mb-1.5 block text-sm text-[#536D79]">วัน</span>
            <DaySelect
              value={scheduleDay}
              onChange={(day) => {
                if (day) setScheduleDay(day);
                clearSubmitError();
              }}
              compact
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm text-[#536D79]">ระยะเวลา</p>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
              <ScheduleTimePicker24Hour
                label="เวลาเริ่ม"
                value={startTime}
                onChange={(value) => {
                  setStartTime(value);
                  clearSubmitError();
                }}
                isInvalid={hasInvalidTimeRange || Boolean(conflictingItem)}
              />
              <span className="pb-2 text-[#78909C]">–</span>
              <ScheduleTimePicker24Hour
                label="เวลาจบ"
                value={endTime}
                onChange={(value) => {
                  setEndTime(value);
                  clearSubmitError();
                }}
                isInvalid={hasInvalidTimeRange || Boolean(conflictingItem)}
              />
            </div>
            {hasInvalidTimeRange && (
              <p role="alert" className="mt-1.5 text-xs text-[#D65D69]">
                เวลาเริ่มต้องอยู่ก่อนเวลาสิ้นสุด
              </p>
            )}
            {conflictingItem && (
              <p
                role="alert"
                className="mt-2 rounded-xl border border-[#F0C1BC] bg-[#FFF2F0] px-3 py-2 text-xs leading-relaxed text-[#B45F58]"
              >
                เวลานี้ทับกับ {conflictingItem.subject_name} เวลา {" "}
                {conflictingItem.start_time}–{conflictingItem.end_time}
              </p>
            )}
          </div>

          {submitError && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600"
            >
              {submitError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 rounded-full border border-[#AFCBD8] bg-white px-5 text-sm text-[#58717D] transition hover:bg-[#EAF7FC] disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#82C4E1] px-5 text-sm text-white shadow-sm transition hover:bg-[#69B3D4] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Plus aria-hidden="true" size={16} strokeWidth={2.8} />
              {isSubmitting ? "กำลังเพิ่ม..." : "เพิ่มบล็อก"}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  );
}

function ScheduleTypeOption({
  value,
  label,
  icon,
  selected,
  colorClass,
  onSelect,
}: {
  value: 2 | 3;
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  colorClass: string;
  onSelect: () => void;
}) {
  return (
    <label
      className={`flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border text-sm transition hover:-translate-y-0.5 hover:shadow-sm ${colorClass} ${selected ? "ring-2 ring-[#7FBBD6] ring-offset-2" : ""}`}
    >
      <input
        type="radio"
        name="schedule-type"
        value={value}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      {icon}
      {label}
    </label>
  );
}
