import { AlertTriangle, LoaderCircle } from "lucide-react";

export default function ConfirmGradeGoalsModal({
  targetGpa,
  isSaving,
  error,
  onBack,
  onConfirm,
}: {
  targetGpa: number;
  isSaving: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="absolute inset-0 z-[120] flex items-center justify-center rounded-[22px] bg-transparent p-2 backdrop-blur-[2px]">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-grade-title"
        className="w-full max-w-[340px] rounded-[22px] border border-white/80 bg-white p-5 text-center shadow-[0_18px_45px_rgba(26,70,94,0.26)]"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF3D8]">
          <AlertTriangle className="h-6 w-6 text-[#E5A637]" aria-hidden="true" />
        </div>
        <h2 id="confirm-grade-title" className="mt-4 text-lg font-semibold text-[#244B63]">
          ยืนยันเป้าหมายนี้ใช่ไหม?
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6B8492]">
          GPA เป้าหมายของเทอมนี้คือ
          <span className="mx-1 font-semibold text-[#4CA9DD]">{targetGpa.toFixed(2)}</span>
          เมื่อยืนยันแล้วจะไม่สามารถแก้ไขได้
        </p>
        {error && (
          <p className="mt-4 rounded-xl bg-[#FFF0F1] px-3 py-2 text-sm text-[#C45D66]">
            {error}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={isSaving}
            onClick={onBack}
            className="min-h-11 rounded-full border border-[#C7DCE8] px-4 text-sm font-medium text-[#618296] transition hover:bg-[#F3F9FC] disabled:opacity-60"
          >
            กลับไปตรวจสอบ
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={onConfirm}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#5EB3E4] px-4 text-sm font-semibold text-white transition hover:bg-[#4CA9DD] disabled:cursor-wait disabled:opacity-70"
          >
            {isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {isSaving ? "กำลังบันทึก" : "ยืนยันและบันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
