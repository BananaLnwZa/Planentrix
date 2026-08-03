import { ArchiveX, Clock3, DoorOpen, GraduationCap, Pencil, RotateCcw, UserRound } from "lucide-react";
import { Subject } from "@/interfaces/subject-management.interface";
import { getSubjectTypeStyle } from "./SubjectTypeLegend";

interface SubjectCardProps {
  subject: Subject;
  onEdit: (subject: Subject) => void;
  onStatusChange: (subject: Subject) => void;
}

const dayNames: Record<number, string> = {
  1: "จันทร์",
  2: "อังคาร",
  3: "พุธ",
  4: "พฤหัสบดี",
  5: "ศุกร์",
  6: "เสาร์",
  7: "อาทิตย์",
};

export default function SubjectCard({ subject, onEdit, onStatusChange }: SubjectCardProps) {
  return (
    <article className={`group flex h-full flex-col rounded-[20px] border p-4 shadow-[0_6px_18px_rgba(51,82,94,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(51,82,94,0.1)] sm:p-5 ${subject.is_active ? "border-[#e4ecef] bg-white hover:border-[#cce2ea]" : "border-[#e2e4e5] bg-[#f3f5f5] opacity-80"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold tracking-wide text-[#4b91aa]">{subject.subject_id}</p>
          <h3 className="mt-1 line-clamp-2 font-semibold leading-6 text-[#334b55]">{subject.subject_name}</h3>
        </div>
        <span className="shrink-0 rounded-xl bg-[#edf6f9] px-2.5 py-1.5 text-xs font-semibold text-[#4d8092]">
          {Number(subject.credits).toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} หน่วยกิต
        </span>
      </div>

      <span className={`mt-3 w-fit rounded-full px-2.5 py-1 text-[11px] font-medium ${getSubjectTypeStyle(subject.subject_type_id)}`}>
        {subject.subject_type_name}
      </span>
      <span className={`mt-2 w-fit rounded-full px-2.5 py-1 text-[11px] font-medium ${subject.is_active ? "bg-[#eaf8f2] text-[#397d63]" : "bg-[#e5e8e9] text-[#65767d]"}`}>
        {subject.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
      </span>

      <dl className="mt-4 grid gap-2.5 text-sm text-[#60747d]">
        <div className="flex items-center gap-2"><Clock3 size={15} className="text-[#7da5b4]" /><dt className="sr-only">เวลาเรียน</dt><dd>วัน{dayNames[subject.schedule_day] ?? "—"} · {subject.start_time}–{subject.end_time}</dd></div>
        <div className="flex items-center gap-2"><UserRound size={15} className="text-[#7da5b4]" /><dt className="sr-only">ผู้สอน</dt><dd className="truncate">{subject.teacher_name}</dd></div>
        <div className="flex items-center gap-2"><DoorOpen size={15} className="text-[#7da5b4]" /><dt className="sr-only">ห้องเรียน</dt><dd>{subject.classroom}</dd></div>
      </dl>

      <div className="mt-auto flex items-center justify-between border-t border-[#edf1f3] pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs text-[#93a0a6]"><GraduationCap size={14} /> ชั้นปี {subject.academic_year}</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => onEdit(subject)} aria-label={`แก้ไขวิชา ${subject.subject_name}`} className="inline-flex size-9 items-center justify-center rounded-xl bg-[#e9f5f9] text-[#43839a] transition hover:bg-[#d9edf4]"><Pencil size={16} /></button>
          <button type="button" onClick={() => onStatusChange(subject)} aria-label={`${subject.is_active ? "ปิดใช้งาน" : "กู้คืน"}วิชา ${subject.subject_name}`} className={`inline-flex size-9 items-center justify-center rounded-xl transition ${subject.is_active ? "bg-[#fff0ec] text-[#c6644d] hover:bg-[#ffe1d9]" : "bg-[#e9f6ef] text-[#438064] hover:bg-[#d9ede3]"}`}>
            {subject.is_active ? <ArchiveX size={16} /> : <RotateCcw size={16} />}
          </button>
        </div>
      </div>
    </article>
  );
}
