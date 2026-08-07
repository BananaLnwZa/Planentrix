import { CheckCircle2, LoaderCircle, X } from "lucide-react";
import { createPortal } from "react-dom";
import { formatClock } from "./timer.utils";

interface FinishSessionModalProps {
  open: boolean;
  elapsedSeconds: number;
  subjectName: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function FinishSessionModal({
  open,
  elapsedSeconds,
  subjectName,
  busy,
  error,
  onCancel,
  onConfirm,
}: FinishSessionModalProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#4c3e43]/30 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="finish-study-title"
        className="relative w-full max-w-[390px] rounded-[24px] border border-[#eadbd7] bg-[#fffdfa] p-6 text-center shadow-[0_24px_70px_rgba(82,53,62,0.28)]"
      >
        <button
          type="button"
          aria-label="ปิดหน้าต่างยืนยัน"
          disabled={busy}
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-full p-1 text-[#a9959c] transition hover:bg-[#f5ecef] hover:text-[#7b626b] disabled:cursor-not-allowed"
        >
          <X size={18} />
        </button>

        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#e4f3e9] text-[#5eaa7d]">
          <CheckCircle2 size={27} />
        </div>
        <h2 id="finish-study-title" className="text-lg font-bold text-[#55484d]">
          ทบทวนเสร็จแล้วใช่ไหม?
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#8d7d83]">
          ระบบจะบันทึกเวลา <strong className="text-[#5c8fac]">{formatClock(elapsedSeconds)}</strong>{" "}
          ให้กับวิชา <strong className="text-[#65555b]">{subjectName}</strong>
        </p>

        {error && (
          <p className="mt-3 rounded-xl bg-[#fff0f1] px-3 py-2 text-xs text-[#b84e5c]">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="h-10 rounded-full border border-[#ded2d3] px-5 text-sm font-semibold text-[#7e6e74] transition hover:bg-[#f7f2f1] disabled:cursor-not-allowed"
          >
            ยังไม่เสร็จ
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#8fc8aa] px-5 text-sm font-semibold text-white transition hover:bg-[#7abb9b] disabled:cursor-not-allowed disabled:bg-[#bdd8ca]"
          >
            {busy && <LoaderCircle size={16} className="animate-spin" />}
            บันทึกเวลา
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
