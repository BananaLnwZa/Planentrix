"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Save, Trash2, X } from "lucide-react";
import DaySelect from "@/components/common/DaySelect";
import type {
  ScheduleItem,
  UpdateScheduleRequest,
} from "@/interfaces/table.interface";
import type { UserConstraint } from "@/interfaces/profile.interface";
import { findConstraintOverlap } from "@/utils/constraintOverlap";
import ConstraintOverlapWarning from "./ConstraintOverlapWarning";
import ScheduleTimePicker24Hour from "./ScheduleTimePicker24Hour";

const thaiDays = [
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
  "อาทิตย์",
];

type ScheduleDetailsPopupProps = {
  item: ScheduleItem;
  isSaving: boolean;
  isDeleting: boolean;
  constraint?: UserConstraint | null;
  onClose: () => void;
  onSave: (data: UpdateScheduleRequest) => Promise<void>;
  onDelete: () => Promise<void>;
};

export default function ScheduleDetailsPopup({
  item,
  isSaving,
  isDeleting,
  constraint,
  onClose,
  onSave,
  onDelete,
}: ScheduleDetailsPopupProps) {
  const isClass = item.schedule_type_id === 1;
  const [isEditing, setIsEditing] = useState(false);
  const [scheduleDay, setScheduleDay] = useState(item.schedule_day);
  const [startTime, setStartTime] = useState(item.start_time);
  const [endTime, setEndTime] = useState(item.end_time);
  const [classroom, setClassroom] = useState(item.classroom ?? "");
  const [note, setNote] = useState(item.note ?? "");
  const [error, setError] = useState("");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [pendingInput, setPendingInput] =
    useState<UpdateScheduleRequest | null>(null);
  const deletableScheduleTypeName =
    item.schedule_type_id === 2 ? "อ่านหนังสือ" : "การบ้าน";
  const hasInvalidTimeRange = Boolean(
    startTime && endTime && startTime >= endTime
  );

  const saveInput = async (input: UpdateScheduleRequest) => {
    try {
      await onSave(input);
      setIsEditing(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "ไม่สามารถบันทึกข้อมูลได้"
      );
    }
  };

  const handleSave = () => {
    setError("");

    if (!startTime || !endTime) {
      setError("กรุณาระบุเวลาเริ่มและเวลาสิ้นสุดให้ครบ");
      return;
    }

    if (hasInvalidTimeRange) {
      setError("เวลาเริ่มต้องอยู่ก่อนเวลาสิ้นสุด");
      return;
    }

    if (isClass && classroom.length > 10) {
      setError("ชื่อห้องเรียนต้องไม่เกิน 10 ตัวอักษร");
      return;
    }

    const input: UpdateScheduleRequest = {
      schedule_day: scheduleDay,
      start_time: startTime,
      end_time: endTime,
      ...(isClass
        ? {
            classroom: classroom.trim() || null,
            note: note.trim() || null,
          }
        : {}),
    };
    const conflict = findConstraintOverlap(constraint, {
      scheduleDay,
      startTime,
      endTime,
    });
    if (conflict) {
      setPendingInput(input);
      return;
    }
    void saveInput(input);
  };

  const pendingConflict = pendingInput
    ? findConstraintOverlap(constraint, {
        scheduleDay: pendingInput.schedule_day,
        startTime: pendingInput.start_time,
        endTime: pendingInput.end_time,
      })
    : null;

  const handleConfirmDelete = async () => {
    setDeleteError("");
    try {
      await onDelete();
    } catch (deleteError) {
      setDeleteError(
        deleteError instanceof Error
          ? deleteError.message
          : "ไม่สามารถลบบล็อกเวลาได้"
      );
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving && !isDeleting) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-details-title"
        className="relative max-h-[calc(100vh-32px)] w-full max-w-[430px] overflow-y-auto rounded-2xl border border-[#C9B8BE] bg-white px-5 pb-5 pt-4 shadow-2xl sm:px-6"
        style={{ fontFamily: "var(--font-sansation)" }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#EEE0E5] pb-3 pr-8">
          <div>
            <p className="text-xs text-[#78909C]">
              {isClass
                ? "คาบเรียน"
                : item.schedule_type_id === 2
                  ? "อ่านหนังสือ"
                  : "การบ้าน"}
            </p>
            <h2
              id="schedule-details-title"
              className="mt-0.5 text-lg font-semibold leading-snug text-[#37474F]"
            >
              {item.subject_name}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={isSaving || isDeleting}
          aria-label="ปิดรายละเอียดตารางเวลา"
          className="absolute right-3 top-3 rounded-full p-1 text-[#EC4F78] transition hover:bg-[#FFF0F5] disabled:opacity-50"
        >
          <X aria-hidden="true" size={24} strokeWidth={3} />
        </button>

        <div className="mt-4 space-y-3 text-sm text-[#465A64]">
          {isClass && (
            <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-xl bg-[#F4FAFD] p-3">
              <span className="text-[#78909C]">รหัสวิชา</span>
              <span className="font-medium text-[#37474F]">{item.subject_id}</span>
              <span className="text-[#78909C]">ชื่อวิชา</span>
              <span className="font-medium text-[#37474F]">{item.subject_name}</span>
              <span className="text-[#78909C]">ผู้สอน</span>
              <span className="font-medium text-[#37474F]">{item.teacher_name}</span>
              <span className="text-[#78909C]">หน่วยกิต</span>
              <span className="font-medium text-[#37474F]">{item.credits}</span>
            </div>
          )}

          <DetailRow label="วันที่เรียน">
            {isEditing ? (
              <DaySelect
                value={scheduleDay}
                onChange={(day) => day && setScheduleDay(day)}
                compact
              />
            ) : (
              <ValuePill>{thaiDays[item.schedule_day - 1] ?? "-"}</ValuePill>
            )}
          </DetailRow>

          <DetailRow label="ระยะเวลา">
            {isEditing ? (
              <div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
                  <ScheduleTimePicker24Hour
                    label="เวลาเริ่ม"
                    value={startTime}
                    onChange={(value) => {
                      setStartTime(value);
                      setError("");
                    }}
                    isInvalid={hasInvalidTimeRange}
                  />
                  <span className="pb-2 text-[#78909C]">–</span>
                  <ScheduleTimePicker24Hour
                    label="เวลาจบ"
                    value={endTime}
                    onChange={(value) => {
                      setEndTime(value);
                      setError("");
                    }}
                    isInvalid={hasInvalidTimeRange}
                  />
                </div>
                {hasInvalidTimeRange && (
                  <p role="alert" className="mt-1.5 text-[11px] text-[#D65D69]">
                    เวลาเริ่มต้องอยู่ก่อนเวลาสิ้นสุด
                  </p>
                )}
              </div>
            ) : (
              <ValuePill>
                {item.start_time} – {item.end_time}
              </ValuePill>
            )}
          </DetailRow>

          {isClass && (
            <>
              <DetailRow label="ห้องเรียน">
                {isEditing ? (
                  <input
                    value={classroom}
                    maxLength={10}
                    onChange={(event) => setClassroom(event.target.value)}
                    placeholder="ไม่ระบุ"
                    className="h-9 w-full rounded-lg border border-[#A9C8D6] px-3 outline-none placeholder:text-[#A8B5BB] focus:border-[#5F9DBA]"
                  />
                ) : (
                  <ValuePill>{item.classroom || "ไม่ระบุ"}</ValuePill>
                )}
              </DetailRow>
              <DetailRow label="โน้ต" alignStart>
                {isEditing ? (
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    placeholder="เพิ่มโน้ตสำหรับคาบนี้"
                    className="w-full resize-none rounded-lg border border-[#A9C8D6] px-3 py-2 outline-none placeholder:text-[#A8B5BB] focus:border-[#5F9DBA]"
                  />
                ) : (
                  <div className="min-h-9 rounded-lg bg-[#F6F8F9] px-3 py-2 text-[#526771]">
                    {item.note || "ไม่มีโน้ต"}
                  </div>
                )}
              </DetailRow>
            </>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          {!isClass ? (
            <button
              type="button"
              onClick={() => {
                setDeleteError("");
                setIsDeleteConfirmOpen(true);
              }}
              disabled={isSaving || isDeleting}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E5A39D] px-4 text-sm text-[#B5534A] transition hover:bg-[#FFF1EF] disabled:cursor-wait disabled:opacity-50"
            >
              <Trash2 size={15} />
              {isDeleting ? "กำลังลบ..." : "ลบ"}
            </button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setScheduleDay(item.schedule_day);
                  setStartTime(item.start_time);
                  setEndTime(item.end_time);
                  setClassroom(item.classroom ?? "");
                  setNote(item.note ?? "");
                  setError("");
                }}
                disabled={isSaving}
                className="h-9 rounded-full border border-[#B9C3C8] px-4 text-sm text-[#52636D] transition hover:bg-[#F4F6F7] disabled:opacity-50"
              >
                ยกเลิก
              </button>
            )}
            <button
              type="button"
              onClick={isEditing ? handleSave : () => setIsEditing(true)}
              disabled={
                isSaving || isDeleting || (isEditing && hasInvalidTimeRange)
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#8FC5DF] px-4 text-sm text-white transition hover:bg-[#72B3D2] disabled:cursor-wait disabled:opacity-50"
            >
              {isEditing ? <Save size={15} /> : <Pencil size={15} />}
              {isSaving ? "กำลังบันทึก..." : isEditing ? "บันทึก" : "แก้ไข"}
            </button>
          </div>
        </div>
      </section>

      {isDeleteConfirmOpen && !isClass && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-[#38596A]/25 p-4 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isDeleting) {
              setIsDeleteConfirmOpen(false);
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-schedule-title"
            aria-describedby="delete-schedule-description"
            className="relative w-full max-w-[340px] overflow-hidden rounded-[22px] border border-[#A9D5E9] bg-gradient-to-b from-[#EFF9FE] to-white px-5 pb-5 pt-6 text-center shadow-[0_18px_45px_rgba(66,112,134,0.25)]"
            style={{ fontFamily: "var(--font-sansation)" }}
          >
            <span
              aria-hidden="true"
              className="absolute -right-7 -top-7 h-20 w-20 rounded-full bg-[#BFE7F8]/70"
            />
            <span
              aria-hidden="true"
              className="absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-[#D8F0FB]/70"
            />

            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(false)}
              disabled={isDeleting}
              aria-label="ปิดการยืนยันลบ"
              className="absolute right-3 top-3 z-10 rounded-full p-1 text-[#5D9AB7] transition hover:bg-[#DFF3FC] disabled:opacity-50"
            >
              <X aria-hidden="true" size={20} strokeWidth={2.7} />
            </button>

            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#8EC6DF] bg-[#CDECF9] text-[#4F91AF] shadow-[0_4px_10px_rgba(79,145,175,0.18)]">
              <Trash2 aria-hidden="true" size={25} strokeWidth={2.2} />
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#F6BE70]" />
            </div>

            <h2
              id="delete-schedule-title"
              className="relative mt-3 text-lg font-semibold text-[#4B5E67]"
            >
              ยืนยันการลบบล็อกเวลา
            </h2>
            <p
              id="delete-schedule-description"
              className="relative mt-2 text-sm leading-relaxed text-[#6E7E85]"
            >
              ต้องการลบบล็อก{deletableScheduleTypeName}ของวิชา
                <span className="mt-1 block font-semibold text-[#4F87A1]">
                {item.subject_name}
              </span>
            </p>
            <p className="relative mt-2 text-[11px] text-[#8298A2]">
              เมื่อลบแล้วจะไม่สามารถกู้คืนบล็อกนี้ได้
            </p>

            {deleteError && (
              <p
                role="alert"
                className="relative mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600"
              >
                {deleteError}
              </p>
            )}

            <div className="relative mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isDeleting}
                className="h-10 rounded-full border border-[#AFCBD8] bg-white text-sm text-[#58717D] transition hover:bg-[#EAF7FC] disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#E49B94] bg-[#F7BBB5] text-sm text-white shadow-sm transition hover:bg-[#ED9F98] disabled:cursor-wait disabled:opacity-60"
              >
                <Trash2 aria-hidden="true" size={15} />
                {isDeleting ? "กำลังลบ..." : "ยืนยันลบ"}
              </button>
            </div>
          </section>
        </div>
      )}
      {pendingInput && pendingConflict && (
        <ConstraintOverlapWarning
          conflict={pendingConflict}
          isSubmitting={isSaving}
          onCancel={() => setPendingInput(null)}
          onConfirm={() => {
            const input = pendingInput;
            setPendingInput(null);
            void saveInput(input);
          }}
        />
      )}
    </div>,
    document.body
  );
}

function DetailRow({
  label,
  children,
  alignStart = false,
}: {
  label: string;
  children: React.ReactNode;
  alignStart?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[82px_minmax(0,1fr)] gap-3 ${alignStart ? "items-start" : "items-center"}`}
    >
      <span className={alignStart ? "pt-2 text-[#78909C]" : "text-[#78909C]"}>
        {label}
      </span>
      {children}
    </div>
  );
}

function ValuePill({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-9 items-center rounded-lg bg-[#E4F3FA] px-3 text-[#526771]">
      {children}
    </div>
  );
}
