"use client";

import { BookOpen, ClipboardCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  {
    label: "รายวิชา",
    description: "วิชาที่รับผิดชอบ",
    href: "/Instructor/Main",
    icon: BookOpen,
  },
  {
    label: "ข้อสอบและงาน",
    description: "เพิ่มและจัดการข้อสอบ",
    href: "/Instructor/Exam",
    icon: ClipboardCheck,
  },
  {
    label: "นักศึกษา",
    description: "ข้อมูลนักศึกษาในรายวิชา",
    href: "/Instructor/Students",
    icon: UsersRound,
  },
] as const;

export default function InstructorWorkspaceNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="เมนูพื้นที่ทำงานอาจารย์"
      className="mx-auto mt-3 w-full max-w-6xl rounded-[24px] border border-white/85 bg-white/75 p-2 shadow-[0_12px_35px_rgba(74,111,132,0.1)] backdrop-blur-xl"
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {menuItems.map(({ label, description, href, icon: Icon }) => {
          const active = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-16 items-center gap-3 rounded-[18px] border px-4 py-3 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dceff5] ${
                active
                  ? "border-[#b9dbe6] bg-[#e9f7fb] text-[#376f84] shadow-sm"
                  : "border-transparent text-[#5c717a] hover:border-[#dcebf0] hover:bg-white/80 hover:text-[#3d7d94]"
              }`}
            >
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                  active ? "bg-white" : "bg-[#edf6f8]"
                }`}
              >
                <Icon aria-hidden="true" size={21} strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{label}</span>
                <span className="mt-0.5 hidden truncate text-xs opacity-70 md:block">
                  {description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
