"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { CurrentTerm } from "@/interfaces/term.interface";

type DialogPosition = {
  left: number;
  top: number;
  width: number;
};

type TermDetailsPopupProps = {
  term: CurrentTerm;
  examStartLabel: string;
  examEndLabel: string;
  position: DialogPosition;
  error: string;
  isEnding: boolean;
  onClose: () => void;
  onEndTerm: () => void;
};

export default function TermDetailsPopup({
  term,
  examStartLabel,
  examEndLabel,
  position,
  error,
  isEnding,
  onClose,
  onEndTerm,
}: TermDetailsPopupProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-[10000] bg-black/30 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="term-details-title"
        style={position}
        className="fixed min-h-[430px] max-h-[calc(100vh-32px)] overflow-y-auto rounded-xl border border-[#AFAFAF] bg-white px-8 pb-8 pt-12 shadow-2xl"
      >
        <h2 id="term-details-title" className="sr-only">
          รายละเอียดเทอมปัจจุบัน
        </h2>

        <button
          type="button"
          onClick={onClose}
          aria-label="ปิดรายละเอียดเทอม"
          className="absolute right-4 top-3 rounded-full p-1 text-[#EC4F78] transition-colors hover:bg-[#FFF0F5] hover:text-[#D93A64] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EC4F78]"
        >
          <X aria-hidden="true" size={30} strokeWidth={3.5} />
        </button>

        <div
          className="space-y-6 text-[#242424]"
          style={{ fontFamily: "var(--font-sansation)" }}
        >
          <div className="flex items-center gap-4 text-[18px] leading-none">
            <span className="w-[118px] shrink-0">ชั้นปีที่</span>
            <span className="flex h-[52px] min-w-[100px] items-center justify-center rounded-full border border-[#83AFC3] bg-[#B9DFF0] px-6 text-[22px] text-[#4A5F6B]">
              {term.academic_year}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[18px] leading-none">
            <span className="w-[118px] shrink-0">ปีการศึกษา</span>
            <span className="flex h-[52px] min-w-[158px] items-center justify-center rounded-full border border-[#83AFC3] bg-[#B9DFF0] px-6 text-[22px] text-[#4A5F6B]">
              {term.semester}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[18px] leading-none">
            <span className="w-[118px] shrink-0">เทอม</span>
            <span className="flex h-[52px] min-w-[100px] items-center justify-center rounded-full border border-[#83AFC3] bg-[#B9DFF0] px-6 text-[22px] text-[#4A5F6B]">
              {term.term}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[18px] leading-none">
            <span className="w-[118px] shrink-0">สัปดาห์สอบ</span>
            <span className="flex h-[52px] min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-full border border-[#83AFC3] bg-[#B9DFF0] px-4 text-[clamp(15px,2.3vw,19px)] text-[#4A5F6B]">
              {examStartLabel} – {examEndLabel}
            </span>
          </div>
        </div>

        <p
          className="mt-8 text-center text-[13px] text-[#333333]"
          style={{ fontFamily: "var(--font-sansation)" }}
        >
          *เมื่อจบเทอมแล้วกรุณากดปุ่มจบเทอมเพื่อเริ่มเทอมใหม่
        </p>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-xs text-red-600"
          >
            {error}
          </p>
        )}

        <div className="mt-7 flex justify-center">
          <button
            type="button"
            onClick={onEndTerm}
            disabled={isEnding}
            className="rounded-full border border-[#8F8F8F] bg-white px-7 py-2 text-[16px] text-[#333333] transition-colors duration-200 hover:border-[#FFFFFF] hover:bg-[#9CC5F9] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E35D82] disabled:cursor-wait disabled:opacity-60"
            style={{ fontFamily: "var(--font-sansation)" }}
          >
            {isEnding ? "กำลังจบเทอม..." : "จบเทอม"}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}
