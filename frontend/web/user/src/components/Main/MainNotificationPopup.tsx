"use client";

import { createPortal } from "react-dom";
import { BellRing, CalendarClock, Clock3, X } from "lucide-react";
import type { AppAlert } from "@/interfaces/app-alert.interface";
import { appAlertKindLabel } from "@/services/app-alert.service";

const displayTime = (alert: AppAlert, now: Date) => {
  if (
    alert.kind === "homework_deadline" &&
    alert.eventAt.getTime() < now.getTime()
  ) {
    return "เลยกำหนดส่ง";
  }
  if (alert.kind === "checkpoint") return "ถึงรอบแล้ว";
  return `${alert.eventAt.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })} น.`;
};

export default function MainNotificationPopup({
  alerts,
  now,
  onClose,
  onOpenAlert,
}: {
  alerts: AppAlert[];
  now: Date;
  onClose: () => void;
  onOpenAlert: (alert: AppAlert) => void;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[15000] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="main-notification-title"
        className="relative flex max-h-[min(620px,calc(100vh-32px))] w-full max-w-[440px] flex-col overflow-hidden rounded-[26px] border border-[#E5A9B8] bg-[#FEFBEA] shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิดการแจ้งเตือน"
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-[#9A5C72] hover:bg-[#FFE7EE]"
        >
          <X className="h-5 w-5" />
        </button>

        <header className="shrink-0 px-6 pb-4 pt-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFE4EC] text-[#B85E7D]">
            <BellRing className="h-6 w-6" />
          </span>
          <h2
            id="main-notification-title"
            className="mt-3 text-lg font-semibold text-[#70475A]"
          >
            การแจ้งเตือน
          </h2>
          <p className="mt-1 text-xs text-[#947180]">
            รายการที่กำลังมาถึงหรือยังต้องดำเนินการ {alerts.length} รายการ
          </p>
        </header>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-5 pb-5">
          {alerts.map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => onOpenAlert(alert)}
              className="flex w-full items-center gap-3 rounded-2xl border border-[#E8D3D9] bg-white px-3.5 py-3 text-left shadow-sm transition hover:border-[#D999AD] hover:bg-[#FFF7FA]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EDF6FA] text-[#6591A5]">
                {alert.kind === "checkpoint" ? (
                  <CalendarClock className="h-4.5 w-4.5" />
                ) : (
                  <Clock3 className="h-4.5 w-4.5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <strong className="truncate text-xs text-[#496573]">
                    {alert.subjectName || "ไม่ระบุวิชา"}
                  </strong>
                  <span className="shrink-0 rounded-full bg-[#FFE7EE] px-2 py-0.5 text-[9px] text-[#A55770]">
                    {appAlertKindLabel(alert.kind)}
                  </span>
                </span>
                <span className="mt-1 block truncate text-[11px] text-[#78646C]">
                  {alert.title}
                </span>
              </span>
              <span
                className={`shrink-0 text-[10px] font-semibold ${
                  alert.kind === "homework_deadline" &&
                  alert.eventAt.getTime() < now.getTime()
                    ? "text-red-500"
                    : "text-[#A06478]"
                }`}
              >
                {displayTime(alert, now)}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>,
    document.body
  );
}

