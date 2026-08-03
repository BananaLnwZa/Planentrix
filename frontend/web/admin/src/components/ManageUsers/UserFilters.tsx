import { Search, SlidersHorizontal } from "lucide-react";

export type UserFilter = "all" | "inactive" | "active";

interface UserFiltersProps {
  search: string;
  filter: UserFilter;
  resultCount: number;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: UserFilter) => void;
}

export default function UserFilters({
  search,
  filter,
  resultCount,
  onSearchChange,
  onFilterChange,
}: UserFiltersProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#e8eef1] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="relative w-full sm:max-w-md">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8aa0aa]"
          size={18}
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="ค้นหาด้วย ID หรือชื่อผู้ใช้"
          aria-label="ค้นหาผู้ใช้"
          className="h-11 w-full rounded-xl border border-[#dce7eb] bg-[#f9fcfd] pl-10 pr-4 text-sm text-[#334b56] outline-none transition placeholder:text-[#9cabb1] focus:border-[#79bdd4] focus:ring-4 focus:ring-[#dff3fa]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex items-center gap-1.5 text-xs text-[#82929a]">
          <SlidersHorizontal size={15} aria-hidden="true" />
          พบ {resultCount.toLocaleString("th-TH")} บัญชี
        </span>
        {(
          [
            ["all", "ทั้งหมด"],
            ["inactive", "เกิน 1 ปี"],
            ["active", "ยังใช้งาน"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onFilterChange(value)}
            className={`rounded-full px-3.5 py-2 text-xs font-medium transition ${
              filter === value
                ? "bg-[#4d94ad] text-white shadow-sm"
                : "bg-[#edf4f6] text-[#58707b] hover:bg-[#dfedf2]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
