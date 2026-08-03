import { Clock3, Eye, FileQuestion, Layers3, Pencil } from "lucide-react";
import { ExamSummary } from "@/interfaces/exam-management.interface";

interface ExamCardProps {
  exam: ExamSummary;
  onView: (exam: ExamSummary) => void;
  onEdit: (exam: ExamSummary) => void;
}

export default function ExamCard({ exam, onView, onEdit }: ExamCardProps) {
  return (
    <article className="flex h-full flex-col rounded-[20px] border border-[#e4ecef] bg-white p-5 shadow-[0_6px_18px_rgba(51,82,94,0.05)] transition hover:-translate-y-0.5 hover:border-[#cce2ea] hover:shadow-[0_12px_28px_rgba(51,82,94,0.1)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-[#4b91aa]">{exam.subject_id}</p>
          <h3 className="mt-1 line-clamp-2 text-lg font-semibold leading-7 text-[#334b55]">{exam.exam_name}</h3>
          <p className="mt-1 truncate text-xs text-[#84949b]">{exam.subject_name}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#edf6f9] px-2.5 py-1 text-[11px] font-medium text-[#4d8092]">#{exam.exam_repository_id}</span>
      </div>
      {!exam.subject_is_active && <span className="mt-3 w-fit rounded-full bg-[#eceff0] px-2.5 py-1 text-[11px] text-[#687980]">วิชาปิดใช้งาน</span>}
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-[#f7fafb] p-3"><dt className="flex items-center gap-1.5 text-xs text-[#87979e]"><Layers3 size={14} /> Parts</dt><dd className="mt-1 font-semibold text-[#425b66]">{exam.part_count.toLocaleString("th-TH")}</dd></div>
        <div className="rounded-xl bg-[#f7fafb] p-3"><dt className="flex items-center gap-1.5 text-xs text-[#87979e]"><FileQuestion size={14} /> คำถาม</dt><dd className="mt-1 font-semibold text-[#425b66]">{exam.total_question.toLocaleString("th-TH")}</dd></div>
        <div className="rounded-xl bg-[#f7fafb] p-3"><dt className="text-xs text-[#87979e]">คะแนนรวม</dt><dd className="mt-1 font-semibold text-[#425b66]">{Number(exam.total_score).toFixed(2)}</dd></div>
        <div className="rounded-xl bg-[#f7fafb] p-3"><dt className="flex items-center gap-1.5 text-xs text-[#87979e]"><Clock3 size={14} /> เวลา</dt><dd className="mt-1 font-semibold text-[#425b66]">{exam.time_limit} นาที</dd></div>
      </dl>
      <div className="mt-auto flex items-center justify-between border-t border-[#edf1f3] pt-4">
        <button type="button" onClick={() => onView(exam)} className="inline-flex items-center gap-2 rounded-xl bg-[#e9f5f9] px-3.5 py-2 text-xs font-medium text-[#3f7f96] transition hover:bg-[#d9edf4]"><Eye size={15} /> จัดการเนื้อหา</button>
        <button type="button" onClick={() => onEdit(exam)} aria-label={`แก้ไข ${exam.exam_name}`} className="inline-flex size-9 items-center justify-center rounded-xl bg-[#f1effb] text-[#7669aa] hover:bg-[#e6e1f6]"><Pencil size={16} /></button>
      </div>
    </article>
  );
}
