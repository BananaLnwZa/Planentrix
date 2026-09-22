import { CircleAlert, RefreshCw } from "lucide-react";

export interface NotebookErrorStateProps {
  message?: string | null;
  detail?: string | null;
  title?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function NotebookErrorLayout({
  detail,
  message,
  title,
  onRetry,
  retryLabel = "ลองใหม่",
}: NotebookErrorStateProps) {
  return (
    <div className="grid h-full min-h-[430px] grid-cols-1 gap-6 md:grid-cols-2 md:gap-[88px] md:px-3 md:py-1 lg:gap-24">
      <div className="flex items-center justify-center p-5 text-center">
        <NotebookErrorState
          detail={detail}
          message={message}
          title={title}
          onRetry={onRetry}
          retryLabel={retryLabel}
        />
      </div>
    </div>
  );
}

export default function NotebookErrorState({
  message,
  detail,
  title,
  onRetry,
  retryLabel = "ลองใหม่",
  className = "",
}: NotebookErrorStateProps) {
  const displayMessage = detail || message || title || "โหลดข้อมูลไม่สำเร็จ";

  return (
    <div
      className={`rounded-3xl border border-[#F1BBC8] bg-white/80 px-8 py-7 text-center text-sm text-[#667C86] ${className}`}
    >
      <CircleAlert className="mx-auto h-8 w-8 text-[#E27691]" />
      <p className="mt-3">{displayMessage}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1 rounded-full border border-[#D3A4B1] px-4 py-2 text-xs text-[#B65D78] transition hover:bg-[#FFF0F3]"
        >
          <RefreshCw className="h-3.5 w-3.5" /> {retryLabel}
        </button>
      )}
    </div>
  );
}
