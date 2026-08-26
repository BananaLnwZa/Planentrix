"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, X } from "lucide-react";
import LocalizedDateTimeInput from "@/components/common/LocalizedDateTimeInput";
import TimePicker24Hour from "@/components/common/TimePicker24Hour";
import type {
  WeeklyBlockInput,
  WeeklyScheduleBlock,
} from "@/interfaces/recommendation.interface";
import type { UserConstraint } from "@/interfaces/profile.interface";
import {
  findConstraintOverlap,
  scheduleDayFromDate,
} from "@/utils/constraintOverlap";
import ConstraintOverlapWarning from "./ConstraintOverlapWarning";

type SubjectOption = {
  subject_id: string;
  subject_name: string;
};

type WeeklyBlockEditorProps = {
  block?: WeeklyScheduleBlock | null;
  subjects: SubjectOption[];
  weekStart: string;
  weekEnd: string;
  isSaving: boolean;
  isDeleting: boolean;
  constraint?: UserConstraint | null;
  onClose: () => void;
  onSave: (input: WeeklyBlockInput) => Promise<void>;
  onDelete?: () => Promise<void>;
};

const trimTime = (value: string) => value.slice(0, 5);

export default function WeeklyBlockEditor({
  block,
  subjects,
  weekStart,
  weekEnd,
  isSaving,
  isDeleting,
  constraint,
  onClose,
  onSave,
  onDelete,
}: WeeklyBlockEditorProps) {
  const defaultSubject = block?.subject_id ?? subjects[0]?.subject_id ?? "";
  const [subjectId, setSubjectId] = useState(defaultSubject);
  const [scheduleTypeId, setScheduleTypeId] = useState<2 | 3>(
    block?.schedule_type_id ?? 2
  );
  const [scheduledDate, setScheduledDate] = useState(
    block?.scheduled_date ?? weekStart
  );
  const [startTime, setStartTime] = useState(
    block ? trimTime(block.start_time) : "18:00"
  );
  const [endTime, setEndTime] = useState(
    block ? trimTime(block.end_time) : "19:00"
  );
  const [error, setError] = useState("");
  const [pendingInput, setPendingInput] =
    useState<WeeklyBlockInput | null>(null);

  const subjectName = useMemo(
    () =>
      subjects.find((subject) => subject.subject_id === subjectId)
        ?.subject_name ?? block?.subject_name ?? subjectId,
    [block?.subject_name, subjectId, subjects]
  );

  const saveInput = async (input: WeeklyBlockInput) => {
    try {
      await onSave(input);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "ไม่สามารถบันทึกบล็อกเวลาได้"
      );
    }
  };

  const handleSave = () => {
    setError("");
    if (!subjectId || !scheduledDate || !startTime || !endTime) {
      setError("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    if (startTime >= endTime) {
      setError("เวลาเริ่มต้องอยู่ก่อนเวลาสิ้นสุด");
      return;
    }
    const input: WeeklyBlockInput = {
      subject_id: subjectId,
      schedule_type_id: scheduleTypeId,
      scheduled_date: scheduledDate,
      start_time: startTime,
      end_time: endTime,
    };
    const conflict = findConstraintOverlap(constraint, {
      scheduleDay: scheduleDayFromDate(scheduledDate),
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
        scheduleDay: scheduleDayFromDate(pendingInput.scheduled_date),
        startTime: pendingInput.start_time,
        endTime: pendingInput.end_time,
      })
    : null;

  const handleDelete = async () => {
    if (!onDelete) return;
    setError("");
    try {
      await onDelete();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "ไม่สามารถลบบล็อกเวลาได้"
      );
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !isSaving &&
          !isDeleting
        ) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekly-block-editor-title"
        className="relative w-full max-w-[430px] rounded-2xl border border-[#D8C8CE] bg-white p-5 shadow-2xl"
        style={{ fontFamily: "var(--font-sansation)" }}
      >
        <button
          type="button"
          aria-label="ปิด"
          onClick={onClose}
          disabled={isSaving || isDeleting}
          className="absolute right-3 top-3 rounded-full p-1 text-[#D85E82] hover:bg-[#FFF0F5] disabled:opacity-50"
        >
          <X size={22} />
        </button>

        <h2
          id="weekly-block-editor-title"
          className="pr-8 text-lg font-semibold text-[#405B69]"
        >
          {block ? "ปรับบล็อกเวลารายสัปดาห์" : "เพิ่มบล็อกเวลา"}
        </h2>
        {block && (
          <p className="mt-1 text-xs text-[#84939A]">
            {subjectName} · {scheduleTypeId === 2 ? "ทบทวน" : "ทำการบ้าน"}
          </p>
        )}

        <div className="mt-5 space-y-4 text-sm text-[#536A74]">
          {!block && (
            <>
              <label className="block">
                <span className="mb-1 block text-xs">รายวิชา</span>
                <select
                  value={subjectId}
                  onChange={(event) => setSubjectId(event.target.value)}
                  className="w-full rounded-xl border border-[#CCD9DE] bg-white px-3 py-2.5 outline-none focus:border-[#73A9BC]"
                >
                  {subjects.map((subject) => (
                    <option key={subject.subject_id} value={subject.subject_id}>
                      {subject.subject_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs">ประเภทเวลา</span>
                <select
                  value={scheduleTypeId}
                  onChange={(event) =>
                    setScheduleTypeId(Number(event.target.value) as 2 | 3)
                  }
                  className="w-full rounded-xl border border-[#CCD9DE] bg-white px-3 py-2.5 outline-none focus:border-[#73A9BC]"
                >
                  <option value={2}>ทบทวน</option>
                  <option value={3}>ทำการบ้าน</option>
                </select>
              </label>
            </>
          )}

          <label className="block">
            <span className="mb-1 block text-xs">วันที่</span>
            <LocalizedDateTimeInput
              id="weekly-block-date"
              type="date"
              min={weekStart}
              max={weekEnd}
              value={scheduledDate}
              onChange={(event) => setScheduledDate(event.target.value)}
              aria-label="เลือกวันที่ของบล็อกเวลา"
              className="h-11 w-full rounded-xl border border-[#CCD9DE] bg-white px-3 text-sm text-[#536A74] outline-none transition focus-visible:border-[#73A9BC]"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1 block text-xs">เวลาเริ่ม</span>
              <TimePicker24Hour
                id="weekly-block-start-time"
                value={startTime}
                onChange={setStartTime}
                ariaLabel="เลือกเวลาเริ่มของบล็อกเวลา"
                iconSize={18}
                className="h-11 w-full rounded-xl border border-[#CCD9DE] bg-white px-3 text-sm text-[#536A74] outline-none transition focus-visible:border-[#73A9BC]"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs">เวลาสิ้นสุด</span>
              <TimePicker24Hour
                id="weekly-block-end-time"
                value={endTime}
                onChange={setEndTime}
                ariaLabel="เลือกเวลาสิ้นสุดของบล็อกเวลา"
                iconSize={18}
                className="h-11 w-full rounded-xl border border-[#CCD9DE] bg-white px-3 text-sm text-[#536A74] outline-none transition focus-visible:border-[#73A9BC]"
              />
            </label>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          {onDelete ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isSaving || isDeleting}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#F0C2CB] px-3 py-2 text-sm text-[#C55369] hover:bg-[#FFF2F4] disabled:opacity-50"
            >
              <Trash2 size={15} />
              {isDeleting ? "กำลังลบ..." : "ลบบล็อก"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="rounded-xl border border-[#D8E1E5] px-4 py-2 text-sm text-[#61747D] hover:bg-[#F6FAFB] disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || isDeleting}
              className="rounded-xl bg-[#72ABC0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#609CAF] disabled:opacity-50"
            >
              {isSaving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      </section>
      {pendingInput && pendingConflict && (
        <ConstraintOverlapWarning
          conflict={pendingConflict}
          isSubmitting={isSaving}
          onCancel={() => setPendingInput(null)}
          onConfirm={() => {
            const input = pendingInput;
            setPendingInput(null);
            void saveInput({ ...input, allow_constraint_overlap: true });
          }}
        />
      )}
    </div>,
    document.body
  );
}
