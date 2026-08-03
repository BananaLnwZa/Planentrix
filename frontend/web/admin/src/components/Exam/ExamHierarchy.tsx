import { ClipboardList, GraduationCap } from "lucide-react";
import { ExamSummary } from "@/interfaces/exam-management.interface";
import ExamCard from "./ExamCard";

interface ExamHierarchyProps {
  exams: ExamSummary[];
  onView: (exam: ExamSummary) => void;
  onEdit: (exam: ExamSummary) => void;
}

const termLabel = (term: number) => (term === 3 ? "ภาคฤดูร้อน" : `เทอม ${term}`);

export default function ExamHierarchy({ exams, onView, onEdit }: ExamHierarchyProps) {
  if (exams.length === 0) {
    return <div className="flex min-h-72 flex-col items-center justify-center rounded-[24px] border border-dashed border-[#cfdde2] bg-white/70 px-6 text-center"><span className="rounded-full bg-[#eaf5f8] p-4 text-[#6394a5]"><ClipboardList size={29} /></span><h2 className="mt-4 font-semibold text-[#3c515b]">ไม่พบชุดข้อสอบ</h2><p className="mt-1 text-sm text-[#87979e]">ลองเปลี่ยนคำค้นหาหรือเพิ่มชุดข้อสอบใหม่</p></div>;
  }
  const years = [...new Set(exams.map((exam) => exam.academic_year))].sort((a, b) => a - b);
  return (
    <div className="space-y-7">
      {years.map((year) => {
        const yearExams = exams.filter((exam) => exam.academic_year === year);
        const terms = [...new Set(yearExams.map((exam) => exam.term))].sort((a, b) => a - b);
        return (
          <section key={year} className="overflow-hidden rounded-[26px] border border-[#dce8ec] bg-[#eef7fa]/65 shadow-[0_10px_30px_rgba(55,88,102,0.06)]">
            <header className="flex items-center gap-3 border-b border-[#dce8ec] bg-[#dff2f8] px-5 py-4 sm:px-6"><span className="rounded-2xl bg-white p-2.5 text-[#4b91aa] shadow-sm"><GraduationCap size={22} /></span><div><h2 className="text-lg font-semibold text-[#31515e]">ชั้นปีที่ {year}</h2><p className="text-xs text-[#76909a]">{yearExams.length} ชุดข้อสอบ</p></div></header>
            <div className="space-y-5 p-4 sm:p-5">
              {terms.map((term) => {
                const termExams = yearExams.filter((exam) => exam.term === term);
                return <section key={term} className="rounded-[22px] border border-[#e0e9ec] bg-[#f9fcfd] p-4 sm:p-5"><div className="mb-4 flex items-center gap-2.5"><h3 className="font-semibold text-[#465e68]">{termLabel(term)}</h3><span className="rounded-full bg-[#fff0ea] px-2 py-0.5 text-[11px] text-[#a86651]">{termExams.length} ชุด</span></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{termExams.map((exam) => <ExamCard key={exam.exam_repository_id} exam={exam} onView={onView} onEdit={onEdit} />)}</div></section>;
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
