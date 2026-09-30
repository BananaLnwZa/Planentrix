"use client";

import { RotateCcw, X } from "lucide-react";
import { formatClock } from "./timer.utils";

export default function ResetTimerModal({
  open,
  elapsedSeconds,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  elapsedSeconds: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[20500] flex items-center justify-center bg-[#24343A]/40 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="reset-timer-title" className="relative w-full max-w-sm rounded-[24px] border border-[#D9E7EC] bg-[#FFFEFA] p-6 text-center shadow-2xl">
        <button type="button" onClick={onCancel} disabled={busy} aria-label="ปิด" className="absolute right-3 top-3 rounded-full p-1.5 text-[#81939A] hover:bg-[#F1F6F8] disabled:opacity-50"><X size={18} /></button>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF0D7] text-[#C68C3E]"><RotateCcw size={22} /></span>
        <h2 id="reset-timer-title" className="mt-3 text-lg font-semibold text-[#4E6570]">รีเซ็ตเวลารอบนี้?</h2>
        <p className="mt-2 text-sm leading-6 text-[#819198]">เวลาที่จับไว้ {formatClock(elapsedSeconds)} จะไม่ถูกบันทึกในสถิติและประวัติ แต่ประวัติรอบก่อนหน้าจะยังอยู่</p>
        <div className="mt-5 flex justify-center gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-full border border-[#CAD7DC] px-5 py-2 text-sm text-[#6D818A] hover:bg-[#F4F8F9] disabled:opacity-50">ยกเลิก</button>
          <button type="button" onClick={onConfirm} disabled={busy} className="rounded-full bg-[#F0B4BD] px-5 py-2 text-sm font-semibold text-white hover:bg-[#E99EAA] disabled:opacity-60">รีเซ็ตเวลา</button>
        </div>
      </section>
    </div>
  );
}
