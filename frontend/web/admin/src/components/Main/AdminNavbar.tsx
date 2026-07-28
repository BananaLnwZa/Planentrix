import {
  BarChart3,
  BookOpen,
  ClipboardList,
  LibraryBig,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import AdminProfileMenu from "./AdminProfileMenu";

const navItems = [
  { label: "สถิติ", href: "/Main", icon: BarChart3, active: true },
  { label: "ผู้ใช้งาน", href: "/Users", icon: UsersRound },
  { label: "ข้อสอบ", href: "/Exams", icon: ClipboardList },
  { label: "วิชา", href: "/Subjects", icon: BookOpen },
  { label: "รายวิชา", href: "/Courses", icon: LibraryBig },
];

interface AdminNavbarProps {
  adminName: string;
  adminId?: string;
}

export default function AdminNavbar({
  adminName,
  adminId,
}: AdminNavbarProps) {
  return (
    <nav
      aria-label="เมนูหลักผู้ดูแลระบบ"
      className="sticky top-3 z-40 mx-auto w-[calc(100%-24px)] max-w-[1440px] rounded-[22px] border border-white/80 bg-[#cfeefa]/95 px-3 py-2.5 shadow-[0_9px_24px_rgba(64,108,125,0.14)] backdrop-blur-xl sm:w-[calc(100%-40px)] sm:px-4"
    >
      <div className="flex items-center justify-between gap-3">
        <AdminProfileMenu adminName={adminName} adminId={adminId} />

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map(({ label, href, icon: Icon, active }) => (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm transition sm:px-4 ${
                active
                  ? "bg-white text-[#3b7085] shadow-sm"
                  : "text-[#38515c] hover:bg-white/55 hover:text-[#347d99]"
              }`}
            >
              <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
