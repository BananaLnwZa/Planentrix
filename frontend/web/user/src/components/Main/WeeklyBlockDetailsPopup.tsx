"use client";

import { createPortal } from "react-dom";
import { BookOpen, CalendarDays, Clock3, ClipboardList, X } from "lucide-react";
import type { WeeklyScheduleBlock } from "@/interfaces/recommendation.interface";
import { formatDisplayDate } from "@/utils/dateTime";

type Props = {
  block: WeeklyScheduleBlock;
  onClose: () => void;
};

export default function WeeklyBlockDetailsPopup({ block, onClose }: Props) {
  const isReview = block.schedule_type_code === "review";
  const typeName = isReview ? "ทบทวน" : "ทำการบ้าน";
  const Icon = isReview ? BookOpen : ClipboardList;

  return createPortal(
    <div
      className="fixed inset-0 z-[12000] flex items-center justify-center bg-[#344E5B]/35 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekly-block-details-title"
        className="relative w-full max-w-[430px] overflow-hidden rounded-[24px] border border-[#C8DCE7] bg-[#FFFDF9] shadow-[0_20px_55px_rgba(47,78,94,0.22)]"
        style={{ fontFamily: "var(--font-sansation)" }}
      >
        <div className="bg-gradient-to-br from-[#E7F5FC] via-[#F5FAFD] to-[#FFF2F7] px-6 pb-5 pt-6">
          <button
            type="button"
            aria-label="ปิด"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1.5 text-[#D85E82] hover:bg-white/75"
          >
            <X size={21} />
          </button>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${isReview ? "bg-[#FFF0BA] text-[#8D6A28]" : "bg-[#F8D1CD] text-[#A15861]"}`}>
            <Icon size={15} aria-hidden="true" />
            {typeName}
          </span>
          <h2 id="weekly-block-details-title" className="mt-3 pr-7 text-xl font-bold leading-snug text-[#365B6E]">
            {block.subject_name}
          </h2>
        </div>

        <div className="space-y-3 px-6 py-5 text-sm text-[#526B78]">
          <div className="flex items-center gap-3 rounded-xl border border-[#D8EAF2] bg-white px-4 py-3">
            <CalendarDays size={19} className="shrink-0 text-[#6AAFCB]" aria-hidden="true" />
            <div>
              <p className="text-[11px] text-[#8196A0]">วันที่</p>
              <p className="font-semibold">{formatDisplayDate(block.scheduled_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-[#D8EAF2] bg-white px-4 py-3">
            <Clock3 size={19} className="shrink-0 text-[#6AAFCB]" aria-hidden="true" />
            <div>
              <p className="text-[11px] text-[#8196A0]">ช่วงเวลา</p>
              <p className="font-semibold">{block.start_time.slice(0, 5)} – {block.end_time.slice(0, 5)} น.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto block rounded-xl bg-[#8FC5DF] px-5 py-2 text-sm font-semibold text-white hover:bg-[#77B6D4]"
          >
            ปิด
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}
