import { Plus, Search } from "lucide-react";
import { ExamSubjectOption } from "@/interfaces/exam-management.interface";

interface ExamToolbarProps {
  search: string;
  selectedSubject: string;
  subjects: ExamSubjectOption[];
  resultCount: number;
  onSearchChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onAdd: () => void;
}

export default function ExamToolbar({ search, selectedSubject, subjects, resultCount, onSearchChange, onSubjectChange, onAdd }: ExamToolbarProps) {
  return (
    <div className="rounded-[22px] border border-[#e1eaed] bg-white p-4 shadow-[0_9px_28px_rgba(55,88,102,0.06)] sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8aa0aa]" size={18} />
          <input type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="ค้นหาชุดข้อสอบ รหัสวิชา หรือชื่อวิชา" aria-label="ค้นหาชุดข้อสอบ" className="h-11 w-full rounded-xl border border-[#dce7eb] bg-[#f9fcfd] pl-10 pr-4 text-sm text-[#334b56] outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#dff3fa]" />
        </div>
        <select value={selectedSubject} onChange={(event) => onSubjectChange(event.target.value)} aria-label="กรองตามวิชา" className="h-11 min-w-64 rounded-xl border border-[#dce7eb] bg-[#f9fcfd] px-3.5 text-sm text-[#4a626c] outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#dff3fa]">
          <option value="all">ทุกวิชา</option>
          {subjects.map((subject) => <option key={subject.subject_id} value={subject.subject_id}>{subject.subject_id} · {subject.subject_name}</option>)}
        </select>
        <button type="button" onClick={onAdd} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#4c93ac] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#3f8299]"><Plus size={18} /> เพิ่มชุดข้อสอบ</button>
      </div>
      <p className="mt-3 text-xs text-[#82929a]">พบ {resultCount.toLocaleString("th-TH")} ชุดข้อสอบ</p>
    </div>
  );
}
