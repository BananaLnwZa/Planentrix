import { CalendarDays, Clock3 } from "lucide-react";

export default function DashboardHeader() {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#6aa6bd]">
          Analytics overview
        </p>
        <h1 className="mt-2 text-3xl font-normal tracking-[-0.03em] text-[#24343b] sm:text-4xl">
          ภาพรวมสถิติการใช้งาน
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718087]">
          ติดตามพฤติกรรมการเรียน การทบทวน และผลลัพธ์ของผู้ใช้งาน Planentrix
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-[#5f747e]">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#d7e8ee] bg-white px-3.5 py-2">
          <CalendarDays aria-hidden="true" size={15} />
          ภาคเรียน 1/2569
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#d7e8ee] bg-white px-3.5 py-2">
          <Clock3 aria-hidden="true" size={15} />
          อัปเดตวันนี้
        </span>
      </div>
    </header>
  );
}
