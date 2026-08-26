"use client";

import { AlertTriangle } from "lucide-react";
import type { ConstraintOverlap } from "@/utils/constraintOverlap";
import { constraintDayName } from "@/utils/constraintOverlap";

export default function ConstraintOverlapWarning({
  conflict,
  isSubmitting,
  onCancel,
  onConfirm,
}: {
  conflict: ConstraintOverlap;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[14000] flex items-center justify-center bg-[#38596A]/40 p-4 backdrop-blur-[3px]">
      <section
        key="constraint-overlap-warning"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="constraint-overlap-title"
        className="w-full max-w-[390px] rounded-[24px] border border-[#E8BF7D] bg-[#FFFDF5] p-5 shadow-[0_22px_60px_rgba(69,82,89,0.30)]"
        style={{ fontFamily: "var(--font-sansation)" }}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFF0C9] text-[#B7792B]">
            <AlertTriangle size={23} />
          </span>
          <div>
            <h2
              id="constraint-overlap-title"
              className="text-lg font-semibold text-[#69533A]"
            >
              เวลานี้ทับกับ Constraint
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#806F5C]">
              วัน{constraintDayName(conflict.scheduleDay)} {conflict.startTime}–
              {conflict.endTime} ขัดกับข้อกำหนดเวลาของคุณ
            </p>
          </div>
        </div>

        <ul className="mt-4 space-y-2 rounded-2xl border border-[#F0D6A9] bg-[#FFF8E8] px-4 py-3 text-sm text-[#765C3A]">
          {conflict.reasons.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span aria-hidden="true">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs leading-relaxed text-[#8A7864]">
          หากยังต้องการลงเวลานี้ ให้กด “ตกลงและบันทึก”
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-full border border-[#D8C7B2] bg-white px-4 py-2 text-sm text-[#6E6256] hover:bg-[#FAF5EE] disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="rounded-full bg-[#E5A453] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D59342] disabled:opacity-50"
          >
            {isSubmitting ? "กำลังบันทึก..." : "ตกลงและบันทึก"}
          </button>
        </div>
      </section>
    </div>
  );
}
