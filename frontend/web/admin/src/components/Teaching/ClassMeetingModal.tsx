"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useState } from "react";
import type {
  ClassMeetingDay,
  SaveClassMeetingPayload,
  TeachingClassMeeting,
  TeachingCourseSection,
} from "@/interfaces/teaching-management.interface";
import { teachingManagementService } from "@/services/teaching-management.service";
import AdminSelect from "@/components/ui/AdminSelect";

export const classMeetingDayLabels: Record<ClassMeetingDay, string> = {
  monday: "วันจันทร์",
  tuesday: "วันอังคาร",
  wednesday: "วันพุธ",
  thursday: "วันพฤหัสบดี",
  friday: "วันศุกร์",
  saturday: "วันเสาร์",
  sunday: "วันอาทิตย์",
};

const dayOptions = Object.entries(classMeetingDayLabels).map(([value, label]) => ({
  value,
  label,
}));

const inputClass =
  "mt-2 h-12 w-full rounded-2xl border border-[#dbe6ea] bg-[linear-gradient(135deg,#ffffff_0%,#f5fafc_100%)] px-4 text-sm text-[#405862] outline-none shadow-[0_5px_16px_rgba(76,135,156,0.07)] transition focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]";

interface ClassMeetingModalProps {
  section: TeachingCourseSection;
  meeting: TeachingClassMeeting | null;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}

export default function ClassMeetingModal({
  section,
  meeting,
  onClose,
  onSaved,
}: ClassMeetingModalProps) {
  const defaultInstructor =
    section.instructors.find((item) => item.instructor_role === "owner") ??
    section.instructors[0];
  const [instructorId, setInstructorId] = useState(
    String(meeting?.instructor_id ?? defaultInstructor?.instructor_id ?? ""),
  );
  const [dayOfWeek, setDayOfWeek] = useState<ClassMeetingDay>(
    meeting?.day_of_week ?? "monday",
  );
  const [startTime, setStartTime] = useState(meeting?.start_time.slice(0, 5) ?? "08:00");
  const [endTime, setEndTime] = useState(meeting?.end_time.slice(0, 5) ?? "10:00");
  const [classroom, setClassroom] = useState(meeting?.classroom ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const instructorLabel = (instructor: TeachingCourseSection["instructors"][number]) =>
    `${instructor.first_name} ${instructor.last_name}`.trim() || instructor.admin_name;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!instructorId || !startTime || !endTime || !classroom.trim()) {
      setError("กรุณาเลือกผู้สอน วัน เวลา และห้องเรียนให้ครบ");
      return;
    }
    if (startTime >= endTime) {
      setError("เวลาเลิกเรียนต้องอยู่หลังเวลาเริ่มเรียน");
      return;
    }

    const payload: SaveClassMeetingPayload = {
      instructor_id: Number(instructorId),
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      classroom: classroom.trim() || null,
    };

    setSaving(true);
    setError("");
    try {
      if (meeting) {
        await teachingManagementService.updateClassMeeting(
          section.section_id,
          meeting.class_meeting_id,
          payload,
        );
        await onSaved(`แก้ไขคาบเรียน ${classMeetingDayLabels[dayOfWeek]} แล้ว`);
      } else {
        await teachingManagementService.createClassMeeting(section.section_id, payload);
        await onSaved(`เพิ่มคาบเรียน ${classMeetingDayLabels[dayOfWeek]} แล้ว`);
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "ไม่สามารถบันทึกคาบเรียนได้",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!meeting) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setError("");
    try {
      await teachingManagementService.deleteClassMeeting(
        section.section_id,
        meeting.class_meeting_id,
      );
      await onSaved(`ลบคาบเรียน ${classMeetingDayLabels[meeting.day_of_week]} แล้ว`);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "ไม่สามารถลบคาบเรียนได้",
      );
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const busy = saving || deleting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#243b45]/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meeting-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(28,54,65,0.25)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#5794aa]">
              Class Meeting
            </p>
            <h2 id="meeting-modal-title" className="mt-1 text-xl font-semibold text-[#304852]">
              {meeting ? "แก้ไขคาบเรียน" : "เพิ่มคาบเรียน"}
            </h2>
            <p className="mt-1 text-sm text-[#7d9098]">
              {section.subject_id} · {section.subject_name} · กลุ่ม {section.section_number}
            </p>
            <p className="mt-1 text-xs text-[#91a0a6]">
              คาบนี้จะเกิดซ้ำทุกสัปดาห์ตลอดภาคการศึกษา
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="ปิด"
            className="rounded-full p-2 text-[#7d9098] transition hover:bg-[#edf4f6] disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-[#4c626c] sm:col-span-2">
            อาจารย์ผู้สอน
            <AdminSelect
              value={instructorId}
              onChange={(value) => {
                setInstructorId(value);
                setError("");
              }}
              options={section.instructors.map((instructor) => ({
                value: String(instructor.instructor_id),
                label: instructorLabel(instructor),
                description:
                  instructor.instructor_role === "owner"
                    ? "อาจารย์เจ้าของวิชา"
                    : "อาจารย์ผู้สอนร่วม",
              }))}
              ariaLabel="เลือกอาจารย์ผู้สอนประจำคาบ"
              placeholder="เลือกอาจารย์ผู้สอน"
              appearance="cute"
              icon={UserRound}
              className="mt-2"
            />
          </label>

          <label className="text-sm font-medium text-[#4c626c] sm:col-span-2">
            วันประจำสัปดาห์
            <AdminSelect
              value={dayOfWeek}
              onChange={(value) => {
                setDayOfWeek(value as ClassMeetingDay);
                setError("");
              }}
              options={dayOptions}
              ariaLabel="เลือกวันประจำสัปดาห์"
              appearance="cute"
              icon={CalendarDays}
              className="mt-2"
            />
          </label>

          <label className="text-sm font-medium text-[#4c626c]">
            เวลาเริ่ม
            <span className="relative block">
              <Clock3 className="pointer-events-none absolute left-4 top-1/2 mt-1 -translate-y-1/2 text-[#6d99a9]" size={17} />
              <input
                type="time"
                value={startTime}
                onChange={(event) => {
                  setStartTime(event.target.value);
                  setError("");
                }}
                className={`${inputClass} pl-11`}
              />
            </span>
          </label>
          <label className="text-sm font-medium text-[#4c626c]">
            เวลาเลิก
            <span className="relative block">
              <Clock3 className="pointer-events-none absolute left-4 top-1/2 mt-1 -translate-y-1/2 text-[#6d99a9]" size={17} />
              <input
                type="time"
                value={endTime}
                onChange={(event) => {
                  setEndTime(event.target.value);
                  setError("");
                }}
                className={`${inputClass} pl-11`}
              />
            </span>
          </label>

          <label className="text-sm font-medium text-[#4c626c] sm:col-span-2">
            ห้องเรียน
            <span className="relative block">
              <MapPin className="pointer-events-none absolute left-4 top-1/2 mt-1 -translate-y-1/2 text-[#6d99a9]" size={17} />
              <input
                value={classroom}
                onChange={(event) => setClassroom(event.target.value)}
                maxLength={100}
                placeholder="เช่น อาคาร 2 ห้อง 301"
                className={`${inputClass} pl-11`}
              />
            </span>
          </label>

          {error && (
            <p role="alert" className="rounded-xl bg-[#fff0ec] px-3.5 py-3 text-sm text-[#a9503c] sm:col-span-2">
              {error}
            </p>
          )}

          {confirmDelete && (
            <div className="flex items-start gap-2 rounded-2xl border border-[#f0ccc3] bg-[#fff6f3] p-3.5 text-sm text-[#a45542] sm:col-span-2">
              <AlertTriangle className="mt-0.5 shrink-0" size={17} />
              <p>กด “ยืนยันลบคาบเรียน” อีกครั้ง ข้อมูลคาบนี้จะถูกนำออกจากตารางเรียน</p>
            </div>
          )}

          <div className="flex flex-col-reverse justify-between gap-3 pt-2 sm:col-span-2 sm:flex-row">
            <div>
              {meeting && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={busy}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 ${
                    confirmDelete
                      ? "bg-[#d86d57] text-white hover:bg-[#c65f4b]"
                      : "bg-[#fff0ec] text-[#b15d49] hover:bg-[#fbe2dc]"
                  }`}
                >
                  {deleting ? <LoaderCircle className="animate-spin" size={17} /> : <Trash2 size={17} />}
                  {deleting ? "กำลังลบ" : confirmDelete ? "ยืนยันลบคาบเรียน" : "ลบคาบเรียน"}
                </button>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-xl px-4 py-2.5 text-sm text-[#687b84] transition hover:bg-[#eef4f6] disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-[#5794aa] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#477f93] disabled:opacity-60"
              >
                {saving ? <LoaderCircle className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}
                {saving ? "กำลังบันทึก" : meeting ? "บันทึกการแก้ไข" : "เพิ่มคาบเรียน"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
