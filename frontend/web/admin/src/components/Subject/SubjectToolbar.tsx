import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { SubjectType } from "@/interfaces/subject-management.interface";

interface SubjectToolbarProps {
  search: string;
  selectedType: string;
  selectedStatus: string;
  subjectTypes: SubjectType[];
  resultCount: number;
  onSearchChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onAdd: () => void;
}

export default function SubjectToolbar({
  search,
  selectedType,
  selectedStatus,
  subjectTypes,
  resultCount,
  onSearchChange,
  onTypeChange,
  onStatusChange,
  onAdd,
}: SubjectToolbarProps) {
  return (
    <div className="rounded-[22px] border border-[#e1eaed] bg-white p-4 shadow-[0_9px_28px_rgba(55,88,102,0.06)] sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8aa0aa]" size={18} />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="ค้นหารหัสวิชา ชื่อวิชา ผู้สอน หรือห้องเรียน"
            aria-label="ค้นหาวิชา"
            className="h-11 w-full rounded-xl border border-[#dce7eb] bg-[#f9fcfd] pl-10 pr-4 text-sm text-[#334b56] outline-none transition placeholder:text-[#9cabb1] focus:border-[#79bdd4] focus:ring-4 focus:ring-[#dff3fa]"
          />
        </div>

        <div className="relative min-w-60">
          <SlidersHorizontal className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8aa0aa]" size={17} />
          <select
            value={selectedType}
            onChange={(event) => onTypeChange(event.target.value)}
            aria-label="กรองตามประเภทวิชา"
            className="h-11 w-full appearance-none rounded-xl border border-[#dce7eb] bg-[#f9fcfd] pl-10 pr-8 text-sm text-[#4a626c] outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#dff3fa]"
          >
            <option value="all">ทุกประเภทวิชา</option>
            {subjectTypes.map((type) => (
              <option key={type.subject_type_id} value={type.subject_type_id}>{type.subject_type_name}</option>
            ))}
          </select>
        </div>

        <select
          value={selectedStatus}
          onChange={(event) => onStatusChange(event.target.value)}
          aria-label="กรองตามสถานะวิชา"
          className="h-11 min-w-40 rounded-xl border border-[#dce7eb] bg-[#f9fcfd] px-3.5 text-sm text-[#4a626c] outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#dff3fa]"
        >
          <option value="all">ทุกสถานะ</option>
          <option value="active">เปิดใช้งาน</option>
          <option value="inactive">ปิดใช้งาน</option>
        </select>

        <button type="button" onClick={onAdd} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#4c93ac] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#3f8299]">
          <Plus size={18} aria-hidden="true" /> เพิ่มวิชา
        </button>
      </div>
      <p className="mt-3 text-xs text-[#82929a]">พบ {resultCount.toLocaleString("th-TH")} วิชา</p>
    </div>
  );
}
