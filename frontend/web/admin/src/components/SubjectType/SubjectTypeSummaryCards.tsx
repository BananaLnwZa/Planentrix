import { BookOpen, CircleCheckBig, CircleDashed, Shapes } from "lucide-react";
import { ManagedSubjectType } from "@/interfaces/subject-type-management.interface";

export default function SubjectTypeSummaryCards({ subjectTypes }: { subjectTypes: ManagedSubjectType[] }) {
  const usedTypes = subjectTypes.filter((type) => Number(type.subject_count) > 0).length;
  const unusedTypes = subjectTypes.length - usedTypes;
  const subjectCount = subjectTypes.reduce(
    (total, type) => total + Number(type.subject_count),
    0,
  );

  const cards = [
    { label: "ประเภททั้งหมด", value: subjectTypes.length, note: "หมวดหมู่ในระบบ", icon: Shapes, style: "bg-[#f1effb] text-[#8174b8]" },
    { label: "กำลังใช้งาน", value: usedTypes, note: "มีรายวิชาในประเภท", icon: CircleCheckBig, style: "bg-[#eaf8f2] text-[#4b9477]" },
    { label: "ยังไม่มีวิชา", value: unusedTypes, note: "สามารถลบได้ทันที", icon: CircleDashed, style: "bg-[#fff1eb] text-[#ce765d]" },
    { label: "วิชาที่จัดประเภทแล้ว", value: subjectCount, note: "จำนวนวิชารวม", icon: BookOpen, style: "bg-[#e9f7fc] text-[#4794af]" },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="สรุปประเภทวิชา">
      {cards.map(({ label, value, note, icon: Icon, style }) => (
        <article key={label} className="rounded-[22px] border border-[#e6eef1] bg-white p-5 shadow-[0_8px_24px_rgba(55,88,102,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-sm text-[#70818a]">{label}</p><p className="mt-2 text-3xl font-semibold text-[#2f4651]">{value.toLocaleString("th-TH")}</p></div>
            <span className={`rounded-2xl p-3 ${style}`}><Icon size={21} /></span>
          </div>
          <p className="mt-3 text-xs text-[#96a3a9]">{note}</p>
        </article>
      ))}
    </section>
  );
}
