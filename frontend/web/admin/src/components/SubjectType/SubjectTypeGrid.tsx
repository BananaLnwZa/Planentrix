import { BookOpen, Pencil, Shapes, Trash2 } from "lucide-react";
import { ManagedSubjectType } from "@/interfaces/subject-type-management.interface";

interface SubjectTypeGridProps {
  subjectTypes: ManagedSubjectType[];
  onEdit: (subjectType: ManagedSubjectType) => void;
  onDelete: (subjectType: ManagedSubjectType) => void;
}

const palettes = [
  ["bg-[#e9f6fa]", "text-[#397d94]", "border-[#d2e9f0]"],
  ["bg-[#fff0ea]", "text-[#ad654f]", "border-[#f3dcd4]"],
  ["bg-[#edf8f2]", "text-[#467d65]", "border-[#d8ebdf]"],
  ["bg-[#f2effb]", "text-[#7465a7]", "border-[#dfd9f0]"],
  ["bg-[#fff7df]", "text-[#94752f]", "border-[#efe3bd]"],
  ["bg-[#fceef4]", "text-[#a65f7d]", "border-[#eed9e2]"],
];

export default function SubjectTypeGrid({ subjectTypes, onEdit, onDelete }: SubjectTypeGridProps) {
  if (subjectTypes.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-[24px] border border-dashed border-[#cfdde2] bg-white/70 px-6 text-center">
        <span className="rounded-full bg-[#f0eef8] p-4 text-[#8074ad]"><Shapes size={29} /></span>
        <h2 className="mt-4 font-semibold text-[#3c515b]">ไม่พบประเภทวิชา</h2>
        <p className="mt-1 text-sm text-[#87979e]">ลองเปลี่ยนคำค้นหาหรือเพิ่มประเภทวิชาใหม่</p>
      </div>
    );
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="รายการประเภทวิชา">
      {subjectTypes.map((type) => {
        const [background, text, border] = palettes[(type.subject_type_id - 1) % palettes.length];
        const count = Number(type.subject_count);
        return (
          <article key={type.subject_type_id} className={`flex min-h-52 flex-col rounded-[22px] border bg-white p-5 shadow-[0_8px_24px_rgba(55,88,102,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(55,88,102,0.1)] ${border}`}>
            <div className="flex items-start justify-between gap-3">
              <span className={`flex size-12 items-center justify-center rounded-2xl ${background} ${text}`}><Shapes size={22} /></span>
              <span className="rounded-full bg-[#f1f5f6] px-2.5 py-1 font-mono text-xs text-[#75868e]">ID #{type.subject_type_id}</span>
            </div>
            <h2 className="mt-4 text-lg font-semibold leading-7 text-[#354d57]">{type.subject_type_name}</h2>
            <div className="mt-2 flex items-center gap-2 text-sm text-[#76878e]"><BookOpen size={15} /><span>{count.toLocaleString("th-TH")} วิชา</span></div>
            <div className="mt-auto flex items-center justify-between border-t border-[#edf1f3] pt-4">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${count > 0 ? "bg-[#eaf8f2] text-[#397d63]" : "bg-[#fff1eb] text-[#ad654f]"}`}>{count > 0 ? "กำลังใช้งาน" : "ยังไม่มีวิชา"}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => onEdit(type)} aria-label={`แก้ไข ${type.subject_type_name}`} className="inline-flex size-9 items-center justify-center rounded-xl bg-[#e9f5f9] text-[#43839a] transition hover:bg-[#d9edf4]"><Pencil size={16} /></button>
                <button type="button" onClick={() => onDelete(type)} aria-label={`ลบ ${type.subject_type_name}`} className="inline-flex size-9 items-center justify-center rounded-xl bg-[#fff0ec] text-[#c6644d] transition hover:bg-[#ffe1d9]"><Trash2 size={16} /></button>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
