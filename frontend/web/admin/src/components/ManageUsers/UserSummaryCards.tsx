import { ClockAlert, LogIn, UserRoundCheck, UsersRound } from "lucide-react";
import { ManagedUser } from "@/interfaces/user-management.interface";

interface UserSummaryCardsProps {
  users: ManagedUser[];
}

export default function UserSummaryCards({ users }: UserSummaryCardsProps) {
  const inactive = users.filter((user) => user.is_inactive).length;
  const neverLoggedIn = users.filter((user) => !user.last_login).length;
  const recentlyActive = users.filter((user) => {
    return user.inactive_days !== null && user.inactive_days >= 0 && user.inactive_days <= 30;
  }).length;

  const cards = [
    {
      label: "บัญชีผู้ใช้ทั้งหมด",
      value: users.length,
      note: "บัญชีในระบบ",
      icon: UsersRound,
      color: "bg-[#e9f7fc] text-[#4794af]",
    },
    {
      label: "ไม่ได้ใช้งานเกิน 1 ปี",
      value: inactive,
      note: "ควรตรวจสอบก่อนลบ",
      icon: ClockAlert,
      color: "bg-[#fff0ea] text-[#d9775b]",
    },
    {
      label: "เข้าใช้ภายใน 30 วัน",
      value: recentlyActive,
      note: "ผู้ใช้ที่ยังเคลื่อนไหว",
      icon: UserRoundCheck,
      color: "bg-[#eaf8f2] text-[#4b9a7b]",
    },
    {
      label: "ยังไม่เคยเข้าใช้งาน",
      value: neverLoggedIn,
      note: "ไม่มีประวัติการเข้าสู่ระบบ",
      icon: LogIn,
      color: "bg-[#f2effc] text-[#8070bd]",
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="สรุปข้อมูลผู้ใช้">
      {cards.map(({ label, value, note, icon: Icon, color }) => (
        <article
          key={label}
          className="rounded-[22px] border border-[#e6eef1] bg-white p-5 shadow-[0_8px_24px_rgba(55,88,102,0.06)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[#70818a]">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-[#2f4651]">{value.toLocaleString("th-TH")}</p>
            </div>
            <span className={`rounded-2xl p-3 ${color}`}>
              <Icon size={21} aria-hidden="true" />
            </span>
          </div>
          <p className="mt-3 text-xs text-[#96a3a9]">{note}</p>
        </article>
      ))}
    </section>
  );
}
