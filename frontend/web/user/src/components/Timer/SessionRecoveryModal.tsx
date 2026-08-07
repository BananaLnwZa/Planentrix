import { AlertTriangle, LoaderCircle, RotateCcw, XCircle } from "lucide-react";
import { createPortal } from "react-dom";
import type {
  RecoveryAction,
  StudySession,
} from "@/interfaces/time.interface";
import { formatClock } from "./timer.utils";

interface SessionRecoveryModalProps {
  session: StudySession | null;
  busy: boolean;
  error: string | null;
  onAction: (action: RecoveryAction) => void;
}

export default function SessionRecoveryModal({
  session,
  busy,
  error,
  onAction,
}: SessionRecoveryModalProps) {
  if (!session || typeof document === "undefined") return null;

  const interrupted = session.session_status === "interrupted";
  const lastSeenText = session.last_seen_at
    ? new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(session.last_seen_at))
    : "ไม่ทราบเวลา";

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#4c3e43]/35 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-title"
        className="w-full max-w-[440px] rounded-[24px] border border-[#eadbd7] bg-[#fffdfa] p-6 shadow-[0_24px_70px_rgba(82,53,62,0.30)]"
      >
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0d8] text-[#c0822d]">
            <AlertTriangle size={27} />
          </div>
          <h2 id="recovery-title" className="text-lg font-bold text-[#55484d]">
            {interrupted
              ? "รายการนี้ครบเวลาสูงสุดแล้ว"
              : "พบรายการจับเวลาที่ขาดการเชื่อมต่อ"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#8d7d83]">
            วิชา <strong className="text-[#65555b]">{session.subject_name}</strong>{" "}
            จับเวลาไว้ <strong className="text-[#5c8fac]">{formatClock(session.elapsed_seconds)}</strong>
          </p>
          <p className="mt-1 text-xs text-[#a49399]">
            ติดต่อระบบล่าสุด: {lastSeenText}
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-[#fff0f1] px-3 py-2 text-center text-xs text-[#b84e5c]">
            {error}
          </p>
        )}

        {interrupted ? (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <RecoveryButton
              disabled={busy}
              tone="danger"
              onClick={() => onAction("cancel")}
            >
              <XCircle size={16} /> ยกเลิกรายการ
            </RecoveryButton>
            <RecoveryButton
              disabled={busy}
              tone="primary"
              onClick={() => onAction("save_interrupted")}
            >
              {busy && <LoaderCircle size={16} className="animate-spin" />}
              บันทึกเวลานี้
            </RecoveryButton>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <RecoveryButton
              disabled={busy}
              tone="primary"
              onClick={() => onAction("continue")}
            >
              <RotateCcw size={16} /> จับเวลาต่อ
            </RecoveryButton>
            <RecoveryButton
              disabled={busy}
              onClick={() => onAction("finish_last_seen")}
            >
              จบ ณ เวลาล่าสุด
            </RecoveryButton>
            <RecoveryButton
              disabled={busy}
              onClick={() => onAction("finish_now")}
            >
              บันทึกถึงตอนนี้
            </RecoveryButton>
            <RecoveryButton
              disabled={busy}
              tone="danger"
              onClick={() => onAction("cancel")}
            >
              ยกเลิกรายการ
            </RecoveryButton>
          </div>
        )}

        <p className="mt-4 text-center text-[10px] leading-4 text-[#aa9ba0]">
          เลือก “จบ ณ เวลาล่าสุด” หากเลิกทบทวนตั้งแต่ตอนที่ปิดหน้าหรือขาดอินเทอร์เน็ต
        </p>
      </div>
    </div>,
    document.body
  );
}

function RecoveryButton({
  children,
  disabled,
  tone = "neutral",
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  tone?: "neutral" | "primary" | "danger";
  onClick: () => void;
}) {
  const toneClass =
    tone === "primary"
      ? "border-[#86bfa5] bg-[#8fc8aa] text-white hover:bg-[#7abb9b]"
      : tone === "danger"
        ? "border-[#efb0b8] bg-[#fff7f7] text-[#b65d69] hover:bg-[#fdebec]"
        : "border-[#ded2d3] bg-white text-[#75676c] hover:bg-[#f7f2f1]";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClass}`}
    >
      {children}
    </button>
  );
}
