import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ManagedUser } from "@/interfaces/user-management.interface";

export default function UserStatusBadge({ user }: { user: ManagedUser }) {
  if (user.is_inactive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff0ea] px-2.5 py-1 text-xs font-medium text-[#b96049]">
        <AlertCircle size={13} aria-hidden="true" />
        {user.last_login ? "เกิน 1 ปี" : "ไม่เคยเข้าใช้"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf8f2] px-2.5 py-1 text-xs font-medium text-[#397d63]">
      <CheckCircle2 size={13} aria-hidden="true" />
      ยังใช้งาน
    </span>
  );
}
