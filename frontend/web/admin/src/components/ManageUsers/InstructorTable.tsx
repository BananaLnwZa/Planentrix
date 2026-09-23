import { Pencil, Presentation, Trash2, UserRound } from "lucide-react";
import type { ManagedInstructor } from "@/interfaces/user-management.interface";
import { formatDisplayDateTime } from "@/utils/dateTime";
import UserStatusBadge from "./UserStatusBadge";

interface InstructorTableProps {
  instructors: ManagedInstructor[];
  onEdit: (instructor: ManagedInstructor) => void;
  onDelete: (instructor: ManagedInstructor) => void;
}

function ActionButtons({
  instructor,
  onEdit,
  onDelete,
}: {
  instructor: ManagedInstructor;
  onEdit: (instructor: ManagedInstructor) => void;
  onDelete: (instructor: ManagedInstructor) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onEdit(instructor)} aria-label={`แก้ไขอาจารย์ ${instructor.admin_name}`} className="inline-flex size-9 items-center justify-center rounded-xl bg-[#f0eef9] text-[#7468a8] transition hover:bg-[#e5e1f4]">
        <Pencil size={16} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => onDelete(instructor)} aria-label={`ลบอาจารย์ ${instructor.admin_name}`} className="inline-flex size-9 items-center justify-center rounded-xl bg-[#fff0ec] text-[#c6644d] transition hover:bg-[#ffe1d9]">
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function InstructorTable({ instructors, onEdit, onDelete }: InstructorTableProps) {
  if (instructors.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
        <span className="rounded-full bg-[#f0eef9] p-4 text-[#7468a8]">
          <Presentation size={28} aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-semibold text-[#3c515b]">ไม่พบอาจารย์</h2>
        <p className="mt-1 text-sm text-[#87979e]">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="bg-[#f7fafb] text-xs font-medium uppercase tracking-wide text-[#73858d]">
              <th className="px-5 py-3.5">อาจารย์</th>
              <th className="px-5 py-3.5">คณะ / สาขา</th>
              <th className="px-5 py-3.5">เบอร์โทร</th>
              <th className="px-5 py-3.5">เข้าใช้ล่าสุด</th>
              <th className="px-5 py-3.5">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {instructors.map((instructor) => (
              <tr
                key={instructor.admin_id}
                className={`border-t border-[#edf1f3] transition hover:bg-[#f8fbfc] ${
                  instructor.is_inactive ? "bg-[#fffaf7]" : "bg-white"
                }`}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f0eef9] font-semibold text-[#7468a8]">
                      {instructor.admin_name.charAt(0).toUpperCase() || <UserRound size={18} />}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-[#334b56]">
                        {[instructor.first_name, instructor.last_name].filter(Boolean).join(" ") || instructor.admin_name}
                      </p>
                      <p className="text-xs text-[#71858e]">@{instructor.admin_name}</p>
                      <p className="max-w-56 truncate text-xs text-[#98a5aa]">{instructor.admin_email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-[#60747d]">
                  <p>{instructor.faculty_name ? `${instructor.faculty_name} (${instructor.faculty_code})` : "—"}</p>
                  <p className="mt-1 text-xs text-[#8b9ba2]">
                    {instructor.department_name ? `${instructor.department_name} (${instructor.department_code})` : "ไม่ได้ระบุสาขา"}
                  </p>
                </td>
                <td className="px-5 py-4 text-sm text-[#60747d]">{instructor.phone || "—"}</td>
                <td className="px-5 py-4">
                  <p className="text-sm text-[#526a74]">{formatDisplayDateTime(instructor.last_login)}</p>
                  {instructor.inactive_days !== null && (
                    <p className="mt-0.5 text-xs text-[#9a8b84]">{instructor.inactive_days.toLocaleString("th-TH")} วันที่แล้ว</p>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <UserStatusBadge user={instructor} />
                    <ActionButtons instructor={instructor} onEdit={onEdit} onDelete={onDelete} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-[#e8eef1] md:hidden">
        {instructors.map((instructor) => (
          <article key={instructor.admin_id} className={instructor.is_inactive ? "bg-[#fffaf7] p-4" : "bg-white p-4"}>
            <div>
              <div className="min-w-0">
                <p className="truncate font-medium text-[#334b56]">
                  {[instructor.first_name, instructor.last_name].filter(Boolean).join(" ") || instructor.admin_name}
                </p>
                <p className="text-xs text-[#8b9aa1]">@{instructor.admin_name}</p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <UserStatusBadge user={instructor} />
                <ActionButtons instructor={instructor} onEdit={onEdit} onDelete={onDelete} />
              </div>
            </div>
            <dl className="mt-4 grid gap-3 text-sm">
              <div><dt className="text-xs text-[#94a2a8]">คณะ / สาขา</dt><dd className="mt-0.5 text-[#536a74]">{instructor.faculty_name || "—"} · {instructor.department_name || "—"}</dd></div>
              <div><dt className="text-xs text-[#94a2a8]">Email</dt><dd className="mt-0.5 truncate text-[#536a74]">{instructor.admin_email}</dd></div>
              <div><dt className="text-xs text-[#94a2a8]">เบอร์โทร</dt><dd className="mt-0.5 text-[#536a74]">{instructor.phone || "—"}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}
