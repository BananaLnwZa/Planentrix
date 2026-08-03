import { Plus, Search } from "lucide-react";

interface SubjectTypeToolbarProps {
  search: string;
  resultCount: number;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
}

export default function SubjectTypeToolbar({ search, resultCount, onSearchChange, onAdd }: SubjectTypeToolbarProps) {
  return (
    <div className="rounded-[22px] border border-[#e1eaed] bg-white p-4 shadow-[0_9px_28px_rgba(55,88,102,0.06)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8aa0aa]" size={18} />
          <input type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="ค้นหาด้วย ID หรือชื่อประเภทวิชา" aria-label="ค้นหาประเภทวิชา" className="h-11 w-full rounded-xl border border-[#dce7eb] bg-[#f9fcfd] pl-10 pr-4 text-sm text-[#334b56] outline-none transition placeholder:text-[#9cabb1] focus:border-[#79bdd4] focus:ring-4 focus:ring-[#dff3fa]" />
        </div>
        <button type="button" onClick={onAdd} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#7669aa] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#685b9b]"><Plus size={18} /> เพิ่มประเภทวิชา</button>
      </div>
      <p className="mt-3 text-xs text-[#82929a]">พบ {resultCount.toLocaleString("th-TH")} ประเภท</p>
    </div>
  );
}
