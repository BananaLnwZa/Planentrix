import { Archive, CheckCircle2, CirclePause } from "lucide-react";
import { ManagedAccountActivity } from "@/interfaces/user-management.interface";

export default function UserStatusBadge({ user }: { user: ManagedAccountActivity }) {
  if (user.status === "suspended") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff0ea] px-2.5 py-1 text-xs font-medium text-[#b96049]">
        <CirclePause size={13} aria-hidden="true" />
        ระงับบัญชี
      </span>
    );
  }
  if (user.status === "archived") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf0f2] px-2.5 py-1 text-xs font-medium text-[#66747b]">
        <Archive size={13} aria-hidden="true" />
        จัดเก็บแล้ว
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf8f2] px-2.5 py-1 text-xs font-medium text-[#397d63]">
      <CheckCircle2 size={13} aria-hidden="true" />
      เปิดใช้งาน
    </span>
  );
}
