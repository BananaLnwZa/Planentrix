import { Search, SlidersHorizontal, X } from "lucide-react";
import AdminSelect from "@/components/ui/AdminSelect";
import type {
  UserDepartmentFilterOption,
  UserFacultyFilterOption,
} from "@/interfaces/user-management.interface";

export type UserFilter = "all" | "inactive" | "active";
export type AccountTab = "student" | "instructor";

interface UserFiltersProps {
  accountTab: AccountTab;
  search: string;
  filter: UserFilter;
  facultyId: string;
  departmentId: string;
  yearLevel: string;
  resultCount: number;
  faculties: UserFacultyFilterOption[];
  departments: UserDepartmentFilterOption[];
  yearLevels: number[];
  onSearchChange: (value: string) => void;
  onFilterChange: (value: UserFilter) => void;
  onFacultyChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onYearLevelChange: (value: string) => void;
  onClear: () => void;
}

export default function UserFilters({
  accountTab,
  search,
  filter,
  facultyId,
  departmentId,
  yearLevel,
  resultCount,
  faculties,
  departments,
  yearLevels,
  onSearchChange,
  onFilterChange,
  onFacultyChange,
  onDepartmentChange,
  onYearLevelChange,
  onClear,
}: UserFiltersProps) {
  const visibleDepartments = facultyId
    ? departments.filter(
        (department) => department.faculty_id === Number(facultyId),
      )
    : departments;
  const hasFilters =
    Boolean(search || facultyId || departmentId || yearLevel) || filter !== "all";

  return (
    <div className="border-b border-[#e8eef1] p-4 sm:p-5">
      <div
        className={`grid gap-3 ${
          accountTab === "student"
            ? "lg:grid-cols-[minmax(260px,1.5fr)_repeat(3,minmax(150px,0.7fr))]"
            : "lg:grid-cols-[minmax(260px,1.5fr)_repeat(2,minmax(180px,0.8fr))]"
        }`}
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8aa0aa]"
            size={18}
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={
              accountTab === "student"
                ? "ค้นหาชื่อ รหัสนักศึกษา Username หรือ Email"
                : "ค้นหาชื่อ รหัสอาจารย์ Username Email หรือเบอร์โทร"
            }
            aria-label="ค้นหาบัญชี"
            className="h-11 w-full rounded-xl border border-[#dce7eb] bg-[#f9fcfd] pl-10 pr-4 text-sm text-[#334b56] outline-none transition placeholder:text-[#9cabb1] focus:border-[#79bdd4] focus:ring-4 focus:ring-[#dff3fa]"
          />
        </div>

        <AdminSelect
          value={facultyId}
          onChange={onFacultyChange}
          ariaLabel="กรองตามคณะ"
          placeholder="ทุกคณะ"
          options={[
            { value: "", label: "ทุกคณะ", description: "ไม่จำกัดคณะ" },
            ...faculties.map((faculty) => ({
              value: String(faculty.faculty_id),
              label: faculty.faculty_name,
              description: faculty.faculty_code,
            })),
          ]}
        />

        <AdminSelect
          value={departmentId}
          onChange={onDepartmentChange}
          ariaLabel="กรองตามสาขา"
          placeholder="ทุกสาขา"
          options={[
            { value: "", label: "ทุกสาขา", description: "ไม่จำกัดสาขา" },
            ...visibleDepartments.map((department) => ({
              value: String(department.department_id),
              label: department.department_name,
              description: department.department_code,
            })),
          ]}
        />

        {accountTab === "student" && (
          <AdminSelect
            value={yearLevel}
            onChange={onYearLevelChange}
            ariaLabel="กรองตามชั้นปี"
            placeholder="ทุกชั้นปี"
            tone="violet"
            options={[
              { value: "", label: "ทุกชั้นปี", description: "ไม่จำกัดชั้นปี" },
              ...yearLevels.map((year) => ({
                value: String(year),
                label: `ชั้นปีที่ ${year}`,
                description: "กรองนักศึกษาตามชั้นปีปัจจุบัน",
              })),
            ]}
          />
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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

        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-[#71858e] transition hover:bg-[#eef4f6]"
          >
            <X size={14} /> ล้างตัวกรอง
          </button>
        )}
      </div>
    </div>
  );
}
