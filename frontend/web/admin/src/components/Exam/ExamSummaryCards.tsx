import { BookOpenCheck, ClipboardList, FileStack, UsersRound } from "lucide-react";
import { ExamSummary } from "@/interfaces/exam-management.interface";

export default function ExamSummaryCards({ exams }: { exams: ExamSummary[] }) {
  const parts = exams.reduce((total, exam) => total + Number(exam.part_count), 0);
  const questions = exams.reduce((total, exam) => total + Number(exam.total_question), 0);
  const attempts = exams.reduce((total, exam) => total + Number(exam.attempt_count), 0);
  const cards = [
    { label: "ชุดข้อสอบ", value: exams.length, note: "ชุดในคลังข้อสอบ", icon: ClipboardList, style: "bg-[#e9f7fc] text-[#4794af]" },
    { label: "Parts ทั้งหมด", value: parts, note: "ส่วนประกอบข้อสอบ", icon: FileStack, style: "bg-[#f1effb] text-[#8174b8]" },
    { label: "คำถามทั้งหมด", value: questions, note: "คำนวณจากข้อมูลจริง", icon: BookOpenCheck, style: "bg-[#eef8f2] text-[#579578]" },
    { label: "ประวัติการทำ", value: attempts, note: "ครั้งที่ผู้ใช้ทำข้อสอบ", icon: UsersRound, style: "bg-[#fff1eb] text-[#d47b60]" },
  ];
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="สรุปคลังข้อสอบ">
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
