"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, BellRing, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AppAlert } from "@/interfaces/app-alert.interface";
import {
  activeAppAlerts,
  appAlertKindLabel,
  buildAppAlerts,
} from "@/services/app-alert.service";
import examService from "@/services/exam.service";
import homeworkService from "@/services/homework.service";
import recommendationService from "@/services/recommendation.service";
import tableService from "@/services/table.service";
import MainNotificationPopup from "./MainNotificationPopup";

const alertTime = (alert: AppAlert, now: Date) => {
  if (
    alert.kind === "homework_deadline" &&
    alert.eventAt.getTime() < now.getTime()
  ) {
    return "เลยเวลา";
  }
  if (alert.kind === "checkpoint") return "ถึงรอบ";
  return alert.eventAt.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export default function MainNotificationCard({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const router = useRouter();
  const [events, setEvents] = useState<AppAlert[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [isOpen, setIsOpen] = useState(false);

  const loadEvents = useCallback(async () => {
    const [homework, schedule, weekly, insights] = await Promise.allSettled([
      homeworkService.getHomeworkOverview(),
      tableService.getCurrentSchedule(),
      recommendationService.getWeeklySchedule(),
      examService.getInsights(),
    ]);
    const current = new Date();
    setEvents(
      buildAppAlerts(
        {
          homeworkTasks:
            homework.status === "fulfilled" ? homework.value.tasks : [],
          currentSchedule:
            schedule.status === "fulfilled" ? schedule.value : null,
          weeklySchedule: weekly.status === "fulfilled" ? weekly.value : null,
          checkpoints:
            insights.status === "fulfilled"
              ? insights.value.nextCheckpoints
              : [],
        },
        current
      )
    );
    setNow(current);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (active) await loadEvents();
    };
    void load();
    const reloadId = window.setInterval(load, 60_000);
    const clockId = window.setInterval(() => setNow(new Date()), 30_000);
    const handleFocus = () => void load();
    window.addEventListener("focus", handleFocus);
    return () => {
      active = false;
      window.clearInterval(reloadId);
      window.clearInterval(clockId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadEvents, refreshKey]);

  const alerts = useMemo(() => activeAppAlerts(events, now), [events, now]);
  const visible = alerts.slice(0, 3);
  const remaining = Math.max(0, alerts.length - visible.length);

  const openAlert = (alert: AppAlert) => {
    setIsOpen(false);
    router.push(alert.destination);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => alerts.length > 0 && setIsOpen(true)}
        aria-label="เปิดรายการแจ้งเตือน"
        className="group flex h-[150px] min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#E5A9B8] bg-[#FFF8F9] text-left shadow-[0_5px_9px_rgba(75,93,102,0.20)]"
      >
        <span className="flex h-9 shrink-0 items-center justify-between border-b border-[#F1CDD7] bg-[#FFE7EE] px-3 text-[11px] font-semibold text-[#8D4560]">
          <span className="flex items-center gap-1.5">
            {alerts.length > 0 ? (
              <BellRing className="h-3.5 w-3.5" />
            ) : (
              <Bell className="h-3.5 w-3.5" />
            )}
            การแจ้งเตือน
          </span>
          {alerts.length > 0 && (
            <span className="rounded-full bg-white px-2 py-0.5 text-[9px] text-[#A55370]">
              {alerts.length}
            </span>
          )}
        </span>

        <span className="flex min-h-0 w-full flex-1 flex-col px-4 py-1.5 transition-colors group-hover:bg-black/[0.04]">
          {visible.length === 0 ? (
            <span className="flex h-full items-center justify-center px-3 text-center text-[10px] text-[#A49399]">
              ยังไม่มีรายการที่ต้องแจ้งเตือน
            </span>
          ) : (
            <>
              {visible.map((alert) => (
                <span
                  key={alert.id}
                  className="flex min-h-0 flex-1 items-center gap-1.5 border-b border-[#F3E2E7] last:border-b-0"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D7819C]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[9.5px] font-semibold text-[#586F7A]">
                      {alert.subjectName || appAlertKindLabel(alert.kind)}
                    </span>
                    <span className="block truncate text-[8.5px] text-[#8B6C77]">
                      {appAlertKindLabel(alert.kind)} · {alert.title}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-[8.5px] font-semibold ${
                      alert.kind === "homework_deadline" &&
                      alert.eventAt.getTime() < now.getTime()
                        ? "text-red-500"
                        : "text-[#A15A72]"
                    }`}
                  >
                    {alertTime(alert, now)}
                  </span>
                </span>
              ))}
              {remaining > 0 && (
                <span className="flex h-4 shrink-0 items-center justify-end text-[8.5px] text-[#A15A72]">
                  +{remaining} รายการ <ChevronRight className="h-3 w-3" />
                </span>
              )}
            </>
          )}
        </span>
      </button>

      {isOpen && alerts.length > 0 && (
        <MainNotificationPopup
          alerts={alerts}
          now={now}
          onClose={() => setIsOpen(false)}
          onOpenAlert={openAlert}
        />
      )}
    </>
  );
}
