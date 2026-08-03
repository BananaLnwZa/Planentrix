import { Pencil, Trash2, UserRound } from "lucide-react";
import { ManagedUser, UserGender } from "@/interfaces/user-management.interface";
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
};

const formatDate = (value: string | null, includeTime = false): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
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
        aria-label={`แก้ไขผู้ใช้ ${user.user_name}`}
        className="inline-flex size-9 items-center justify-center rounded-xl bg-[#e9f5f9] text-[#43839a] transition hover:bg-[#d9edf4]"
      >
        <Pencil size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(user)}
        aria-label={`ลบผู้ใช้ ${user.user_name}`}
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
        <h2 className="mt-4 font-semibold text-[#3c515b]">ไม่พบผู้ใช้งาน</h2>
        <p className="mt-1 text-sm text-[#87979e]">ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="bg-[#f7fafb] text-xs font-medium uppercase tracking-wide text-[#73858d]">
              <th className="px-5 py-3.5">ID</th>
              <th className="px-5 py-3.5">ผู้ใช้งาน</th>
              <th className="px-5 py-3.5">วันเกิด</th>
              <th className="px-5 py-3.5">เพศ</th>
              <th className="px-5 py-3.5">เข้าใช้ล่าสุด</th>
              <th className="px-5 py-3.5">สถานะ</th>
              <th className="px-5 py-3.5 text-right">จัดการ</th>
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
                <td className="px-5 py-4 text-sm font-medium text-[#58707a]">#{user.user_id}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar userName={user.user_name} />
                    <div>
                      <p className="font-medium text-[#334b56]">{user.user_name}</p>
                      <p className="text-xs text-[#98a5aa]">User ID {user.user_id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-[#60747d]">{formatDate(user.user_birthdate)}</td>
                <td className="px-5 py-4 text-sm text-[#60747d]">{genderLabels[user.user_gender]}</td>
                <td className="px-5 py-4">
                  <p className="text-sm text-[#526a74]">{formatDate(user.last_login, true)}</p>
                  {user.inactive_days !== null && (
                    <p className="mt-0.5 text-xs text-[#9a8b84]">
                      {user.inactive_days.toLocaleString("th-TH")} วันที่แล้ว
                    </p>
                  )}
                </td>
                <td className="px-5 py-4"><UserStatusBadge user={user} /></td>
                <td className="px-5 py-4"><ActionButtons user={user} onEdit={onEdit} onDelete={onDelete} /></td>
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
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="truncate font-medium text-[#334b56]">{user.user_name}</p>
                    <p className="text-xs text-[#8b9aa1]">User ID #{user.user_id}</p>
                  </div>
                  <UserStatusBadge user={user} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-[#94a2a8]">วันเกิด</dt><dd className="mt-0.5 text-[#536a74]">{formatDate(user.user_birthdate)}</dd></div>
                  <div><dt className="text-xs text-[#94a2a8]">เพศ</dt><dd className="mt-0.5 text-[#536a74]">{genderLabels[user.user_gender]}</dd></div>
                  <div className="col-span-2"><dt className="text-xs text-[#94a2a8]">เข้าใช้ล่าสุด</dt><dd className="mt-0.5 text-[#536a74]">{formatDate(user.last_login, true)}</dd></div>
                </dl>
                <div className="mt-4"><ActionButtons user={user} onEdit={onEdit} onDelete={onDelete} /></div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
