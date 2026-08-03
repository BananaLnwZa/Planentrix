import { Archive, BookCopy, CircleCheckBig, Shapes } from "lucide-react";
import { Subject, SubjectType } from "@/interfaces/subject-management.interface";

interface SubjectSummaryCardsProps {
  subjects: Subject[];
  subjectTypes: SubjectType[];
}

export default function SubjectSummaryCards({ subjects, subjectTypes }: SubjectSummaryCardsProps) {
  const activeSubjects = subjects.filter((subject) => subject.is_active).length;
  const inactiveSubjects = subjects.length - activeSubjects;

  const cards = [
    { label: "วิชาทั้งหมด", value: subjects.length, note: "รายวิชาในหลักสูตร", icon: BookCopy, style: "bg-[#e9f7fc] text-[#4794af]" },
    { label: "เปิดใช้งาน", value: activeSubjects, note: "นำไปสร้างตารางเรียนใหม่ได้", icon: CircleCheckBig, style: "bg-[#eef8f2] text-[#579578]" },
    { label: "ปิดใช้งาน", value: inactiveSubjects, note: "เก็บไว้สำหรับข้อมูลย้อนหลัง", icon: Archive, style: "bg-[#fff1eb] text-[#d47b60]" },
    { label: "ประเภทวิชา", value: subjectTypes.length, note: "ประเภทจากฐานข้อมูล", icon: Shapes, style: "bg-[#f1effb] text-[#8174b8]" },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="สรุปข้อมูลวิชา">
      {cards.map(({ label, value, note, icon: Icon, style }) => (
        <article key={label} className="rounded-[22px] border border-[#e6eef1] bg-white p-5 shadow-[0_8px_24px_rgba(55,88,102,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[#70818a]">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-[#2f4651]">{value.toLocaleString("th-TH")}</p>
            </div>
            <span className={`rounded-2xl p-3 ${style}`}><Icon size={21} aria-hidden="true" /></span>
          </div>
          <p className="mt-3 text-xs text-[#96a3a9]">{note}</p>
        </article>
      ))}
    </section>
  );
}
