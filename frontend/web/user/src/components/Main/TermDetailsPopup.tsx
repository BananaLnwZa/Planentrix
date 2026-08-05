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
  midtermStartLabel: string;
  midtermEndLabel: string;
  finalStartLabel: string;
  finalEndLabel: string;
  position: DialogPosition;
  error: string;
  isEnding: boolean;
  onClose: () => void;
  onEndTerm: () => void;
};

export default function TermDetailsPopup({
  term,
  midtermStartLabel,
  midtermEndLabel,
  finalStartLabel,
  finalEndLabel,
  position,
  error,
  isEnding,
  onClose,
  onEndTerm,
}: TermDetailsPopupProps) {
  const dialogWidth = Math.min(position.width, 380);
  const dialogStyle = {
    ...position,
    left: position.left + (position.width - dialogWidth) / 2,
    width: dialogWidth,
  };

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
        style={dialogStyle}
        className="fixed max-h-[calc(100vh-32px)] overflow-y-auto rounded-xl border border-[#AFAFAF] bg-white px-6 pb-6 pt-10 shadow-2xl"
      >
        <h2 id="term-details-title" className="sr-only">
          รายละเอียดเทอมปัจจุบัน
        </h2>

        <button
          type="button"
          onClick={onClose}
          aria-label="ปิดรายละเอียดเทอม"
          className="absolute right-3 top-2 rounded-full p-1 text-[#EC4F78] transition-colors hover:bg-[#FFF0F5] hover:text-[#D93A64] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EC4F78]"
        >
          <X aria-hidden="true" size={25} strokeWidth={3.25} />
        </button>

        <div
          className="space-y-3.5 text-[#242424]"
          style={{ fontFamily: "var(--font-sansation)" }}
        >
          <div className="grid grid-cols-[96px_1fr] items-center gap-3 text-[16px] leading-none">
            <span>ชั้นปีที่</span>
            <span className="flex h-9 w-fit min-w-[64px] items-center justify-center rounded-full border border-[#83AFC3] bg-[#B9DFF0] px-4 text-[16px] text-[#4A5F6B]">
              {term.academic_year}
            </span>
          </div>

          <div className="grid grid-cols-[96px_1fr] items-center gap-3 text-[16px] leading-none">
            <span>ปีการศึกษา</span>
            <span className="flex h-9 w-fit min-w-[104px] items-center justify-center rounded-full border border-[#83AFC3] bg-[#B9DFF0] px-4 text-[16px] text-[#4A5F6B]">
              {term.semester}
            </span>
          </div>

          <div className="grid grid-cols-[96px_1fr] items-center gap-3 text-[16px] leading-none">
            <span>เทอม</span>
            <span className="flex h-9 w-fit min-w-[64px] items-center justify-center rounded-full border border-[#83AFC3] bg-[#B9DFF0] px-4 text-[16px] text-[#4A5F6B]">
              {term.term}
            </span>
          </div>

          <div className="rounded-2xl border border-[#B9D9E7] bg-[#F4FAFD] p-3">
            <p className="mb-2.5 text-[14px] font-medium text-[#6A8795]">
              ช่วงสัปดาห์สอบ
            </p>
            <div className="space-y-2">
              <div className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-2 text-[13px]">
                <span className="whitespace-nowrap text-[#506E7C]">สอบกลางภาค</span>
                <span className="flex h-9 min-w-0 items-center justify-center whitespace-nowrap rounded-full border border-[#83AFC3] bg-[#B9DFF0] px-2 text-[clamp(11px,2vw,13px)] text-[#4A5F6B]">
                  {midtermStartLabel} – {midtermEndLabel}
                </span>
              </div>
              <div className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-2 text-[13px]">
                <span className="whitespace-nowrap text-[#506E7C]">สอบปลายภาค</span>
                <span className="flex h-9 min-w-0 items-center justify-center whitespace-nowrap rounded-full border border-[#83AFC3] bg-[#B9DFF0] px-2 text-[clamp(11px,2vw,13px)] text-[#4A5F6B]">
                  {finalStartLabel} – {finalEndLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        <p
          className="mt-5 text-center text-[12px] text-[#555555]"
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

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={onEndTerm}
            disabled={isEnding}
            className="rounded-full border border-[#8F8F8F] bg-white px-6 py-1.5 text-[14px] text-[#333333] transition-colors duration-200 hover:border-[#FFFFFF] hover:bg-[#9CC5F9] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E35D82] disabled:cursor-wait disabled:opacity-60"
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
