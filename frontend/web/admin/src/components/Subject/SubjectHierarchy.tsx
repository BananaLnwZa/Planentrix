import { BookOpen, CalendarDays, GraduationCap } from "lucide-react";
import { Subject } from "@/interfaces/subject-management.interface";
import SubjectCard from "./SubjectCard";

interface SubjectHierarchyProps {
  subjects: Subject[];
  onEdit: (subject: Subject) => void;
  onStatusChange: (subject: Subject) => void;
}

const termLabel = (term: number) => (term === 3 ? "ภาคฤดูร้อน" : `เทอม ${term}`);

export default function SubjectHierarchy({ subjects, onEdit, onStatusChange }: SubjectHierarchyProps) {
  if (subjects.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-[24px] border border-dashed border-[#cfdde2] bg-white/70 px-6 text-center">
        <span className="rounded-full bg-[#eaf5f8] p-4 text-[#6394a5]"><BookOpen size={29} /></span>
        <h2 className="mt-4 font-semibold text-[#3c515b]">ไม่พบวิชา</h2>
        <p className="mt-1 text-sm text-[#87979e]">ลองเปลี่ยนคำค้นหา ประเภทวิชา หรือเพิ่มวิชาใหม่</p>
      </div>
    );
  }

  const academicYears = [...new Set(subjects.map((subject) => subject.academic_year))].sort((a, b) => a - b);

  return (
    <div className="space-y-7">
      {academicYears.map((academicYear) => {
        const yearSubjects = subjects.filter((subject) => subject.academic_year === academicYear);
        const terms = [...new Set(yearSubjects.map((subject) => subject.term))].sort((a, b) => a - b);

        return (
          <section key={academicYear} className="overflow-hidden rounded-[26px] border border-[#dce8ec] bg-[#eef7fa]/65 shadow-[0_10px_30px_rgba(55,88,102,0.06)]" aria-labelledby={`year-${academicYear}`}>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce8ec] bg-[#dff2f8] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-white p-2.5 text-[#4b91aa] shadow-sm"><GraduationCap size={22} /></span>
                <div>
                  <h2 id={`year-${academicYear}`} className="text-lg font-semibold text-[#31515e]">ชั้นปีที่ {academicYear}</h2>
                  <p className="text-xs text-[#76909a]">{yearSubjects.length.toLocaleString("th-TH")} วิชา · {terms.length.toLocaleString("th-TH")} ภาคเรียน</p>
                </div>
              </div>
            </header>

            <div className="space-y-5 p-4 sm:p-5">
              {terms.map((term) => {
                const termSubjects = yearSubjects.filter((subject) => subject.term === term);
                return (
                  <section key={term} className="rounded-[22px] border border-[#e0e9ec] bg-[#f9fcfd] p-4 sm:p-5" aria-labelledby={`year-${academicYear}-term-${term}`}>
                    <div className="mb-4 flex items-center gap-2.5">
                      <CalendarDays size={18} className="text-[#d07b61]" />
                      <h3 id={`year-${academicYear}-term-${term}`} className="font-semibold text-[#465e68]">{termLabel(term)}</h3>
                      <span className="rounded-full bg-[#fff0ea] px-2 py-0.5 text-[11px] font-medium text-[#a86651]">{termSubjects.length.toLocaleString("th-TH")} วิชา</span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {termSubjects.map((subject) => <SubjectCard key={subject.subject_id} subject={subject} onEdit={onEdit} onStatusChange={onStatusChange} />)}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
