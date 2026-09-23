import { Pencil, Trash2, UserRound } from "lucide-react";
import type { ManagedUser, UserGender } from "@/interfaces/user-management.interface";
import { formatDisplayDateTime } from "@/utils/dateTime";
import UserStatusBadge from "./UserStatusBadge";

interface UserTableProps {
  users: ManagedUser[];
  onEdit: (user: ManagedUser) => void;
  onDelete: (user: ManagedUser) => void;
}

const genderLabels: Record<UserGender, string> = {
  male: "ชาย",
  female: "หญิง",
  other: "อื่น ๆ",
  unspecified: "ไม่ระบุ",
};

function UserAvatar({ userName }: { userName: string }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e6f5fa] font-semibold text-[#43849b]">
      {userName.charAt(0).toUpperCase() || <UserRound size={18} />}
    </span>
  );
}

function ActionButtons({
  user,
  onEdit,
  onDelete,
}: {
  user: ManagedUser;
  onEdit: (user: ManagedUser) => void;
  onDelete: (user: ManagedUser) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => onEdit(user)}
        aria-label={`แก้ไขนักศึกษา ${user.user_name}`}
        className="inline-flex size-9 items-center justify-center rounded-xl bg-[#e9f5f9] text-[#43839a] transition hover:bg-[#d9edf4]"
      >
        <Pencil size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(user)}
        aria-label={`ลบนักศึกษา ${user.user_name}`}
        className="inline-flex size-9 items-center justify-center rounded-xl bg-[#fff0ec] text-[#c6644d] transition hover:bg-[#ffe1d9]"
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function UserTable({ users, onEdit, onDelete }: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
        <span className="rounded-full bg-[#edf6f9] p-4 text-[#6c9aaa]">
          <UserRound size={28} aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-semibold text-[#3c515b]">ไม่พบนักศึกษา</h2>
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
              <th className="px-5 py-3.5">นักศึกษา</th>
              <th className="px-5 py-3.5">คณะ / สาขา</th>
              <th className="px-5 py-3.5 text-center">ชั้นปี</th>
              <th className="px-5 py-3.5">เข้าใช้ล่าสุด</th>
              <th className="px-5 py-3.5">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.user_id}
                className={`border-t border-[#edf1f3] transition hover:bg-[#f8fbfc] ${
                  user.is_inactive ? "bg-[#fffaf7]" : "bg-white"
                }`}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar userName={user.user_name} />
                    <div className="min-w-0">
                      <p className="font-medium text-[#334b56]">
                        {[user.first_name, user.last_name].filter(Boolean).join(" ") || user.user_name}
                      </p>
                      <p className="text-xs text-[#71858e]">@{user.user_name} · {genderLabels[user.user_gender]}</p>
                      <p className="max-w-56 truncate text-xs text-[#98a5aa]">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-[#60747d]">
                  <p>{user.faculty_name} ({user.faculty_code})</p>
                  <p className="mt-1 text-xs text-[#8b9ba2]">{user.department_name} ({user.department_code})</p>
                </td>
                <td className="px-5 py-4 text-center text-sm font-medium text-[#526a74]">
                  {user.year_level ?? "—"}
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm text-[#526a74]">{formatDisplayDateTime(user.last_login)}</p>
                  {user.inactive_days !== null && (
                    <p className="mt-0.5 text-xs text-[#9a8b84]">
                      {user.inactive_days.toLocaleString("th-TH")} วันที่แล้ว
                    </p>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <UserStatusBadge user={user} />
                    <ActionButtons user={user} onEdit={onEdit} onDelete={onDelete} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-[#e8eef1] md:hidden">
        {users.map((user) => (
          <article key={user.user_id} className={user.is_inactive ? "bg-[#fffaf7] p-4" : "bg-white p-4"}>
            <div className="flex items-start gap-3">
              <UserAvatar userName={user.user_name} />
              <div className="min-w-0 flex-1">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#334b56]">
                      {[user.first_name, user.last_name].filter(Boolean).join(" ") || user.user_name}
                    </p>
                    <p className="text-xs text-[#8b9aa1]">@{user.user_name}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <UserStatusBadge user={user} />
                    <ActionButtons user={user} onEdit={onEdit} onDelete={onDelete} />
                  </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="col-span-2"><dt className="text-xs text-[#94a2a8]">คณะ / สาขา</dt><dd className="mt-0.5 text-[#536a74]">{user.faculty_name} · {user.department_name}</dd></div>
                  <div><dt className="text-xs text-[#94a2a8]">ชั้นปี</dt><dd className="mt-0.5 text-[#536a74]">{user.year_level ?? "—"}</dd></div>
                  <div><dt className="text-xs text-[#94a2a8]">เพศ</dt><dd className="mt-0.5 text-[#536a74]">{genderLabels[user.user_gender]}</dd></div>
                  <div className="col-span-2"><dt className="text-xs text-[#94a2a8]">Email</dt><dd className="mt-0.5 truncate text-[#536a74]">{user.email}</dd></div>
                </dl>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
