"use client";

import {
  BookOpen,
  Building2,
  CalendarRange,
  ChevronDown,
  Landmark,
  UserPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import AdminProfileMenu from "./AdminProfileMenu";

const academicItems = [
  { label: "รายวิชาและหลักสูตร", href: "/Subject", icon: BookOpen },
  { label: "คณะ", href: "/Faculty", icon: Landmark },
  { label: "สาขา", href: "/Department", icon: Building2 },
];

const accountItems = [
  { label: "นักศึกษาและอาจารย์", href: "/ManageUsers", icon: UsersRound },
  { label: "สร้างบัญชีเจ้าหน้าที่/อาจารย์", href: "/SignInAdmin", icon: UserPlus },
];

interface AdminNavbarProps {
  adminName: string;
  adminId?: string;
  activeHref?: string;
}

export default function AdminNavbar({
  adminName,
  adminId,
  activeHref = "/Teaching",
}: AdminNavbarProps) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const closeMenusOutsideTarget = (event: PointerEvent) => {
      const target = event.target as Node;
      navRef.current
        ?.querySelectorAll<HTMLDetailsElement>("details[open]")
        .forEach((menu) => {
          if (!menu.contains(target)) menu.removeAttribute("open");
        });
    };
    const closeMenusWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      navRef.current
        ?.querySelectorAll<HTMLDetailsElement>("details[open]")
        .forEach((menu) => menu.removeAttribute("open"));
    };

    document.addEventListener("pointerdown", closeMenusOutsideTarget);
    document.addEventListener("keydown", closeMenusWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenusOutsideTarget);
      document.removeEventListener("keydown", closeMenusWithEscape);
    };
  }, []);

  const menuItem = (
    { label, href, icon: Icon }: (typeof academicItems)[number],
    compact = false,
  ) => {
    const active = href === activeHref;
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`inline-flex items-center gap-2 text-sm transition ${compact ? "w-full rounded-xl px-3 py-2.5" : "h-10 rounded-full px-3.5 sm:px-4"} ${
          active
            ? "bg-white text-[#3b7085] shadow-sm"
            : "text-[#38515c] hover:bg-white/55 hover:text-[#347d99]"
        }`}
      >
        <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
        <span>{label}</span>
      </Link>
    );
  };

  const dropdown = (
    label: string,
    items: typeof academicItems,
  ) => {
    const active = items.some((item) => item.href === activeHref);
    return (
      <details className="group relative shrink-0">
        <summary
          className={`flex h-10 cursor-pointer list-none items-center gap-2 rounded-full px-3.5 text-sm transition marker:content-none sm:px-4 ${active ? "bg-white text-[#3b7085] shadow-sm" : "text-[#38515c] hover:bg-white/55 hover:text-[#347d99]"}`}
        >
          <span>{label}</span>
          <ChevronDown size={15} className="transition group-open:rotate-180" />
        </summary>
        <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-white/90 bg-[#eef9fc] p-2 shadow-[0_14px_34px_rgba(48,83,97,0.2)]">
          {items.map((item) => menuItem(item, true))}
        </div>
      </details>
    );
  };

  return (
    <nav
      ref={navRef}
      aria-label="เมนูหลักผู้ดูแลระบบ"
      className="sticky top-3 z-40 mx-auto w-[calc(100%-24px)] max-w-[1440px] rounded-[22px] border border-white/80 bg-[#cfeefa]/95 px-3 py-2.5 shadow-[0_9px_24px_rgba(64,108,125,0.14)] backdrop-blur-xl sm:w-[calc(100%-40px)] sm:px-4"
    >
      <div className="flex items-center justify-between gap-3">
        <AdminProfileMenu adminName={adminName} adminId={adminId} />

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1">
          {menuItem({ label: "การเปิดสอน", href: "/Teaching", icon: CalendarRange })}
          {dropdown("ข้อมูลการศึกษา", academicItems)}
          {dropdown("จัดการบัญชี", accountItems)}
        </div>
      </div>
    </nav>
  );
}
