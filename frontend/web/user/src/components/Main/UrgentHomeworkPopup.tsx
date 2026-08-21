"use client";

import { Bell, BookOpen, Clock3, X } from "lucide-react";
import { createPortal } from "react-dom";
import type { HomeworkTask } from "@/interfaces/homework.interface";
import type { HomeworkNotificationPermission } from "@/services/homework-reminder.service";
import { formatDisplayDate, formatDisplayTime } from "@/utils/dateTime";

export default function UrgentHomeworkPopup({
  tasks,
  permission,
  onClose,
  onNotificationSettings,
  onViewAll,
}: {
  tasks: HomeworkTask[];
  permission: HomeworkNotificationPermission | "checking";
  onClose: () => void;
  onNotificationSettings: () => void;
  onViewAll: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#42525A]/35 p-4 backdrop-blur-[2px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="urgent-homework-title"
        className="relative w-full max-w-[440px] rounded-[28px] border border-[#E5A9B8] bg-[#FFFBEA] px-6 py-6 text-[#3D505A] shadow-[0_14px_35px_rgba(61,80,90,0.25)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="absolute right-5 top-5 rounded-full p-1 text-[#7A6A70] transition hover:bg-white hover:text-[#3D505A]"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#E5A9B8] bg-[#FFF0F4] text-[#B85E7D] shadow-sm">
          <Bell className="h-7 w-7" />
        </div>
        <h2
          id="urgent-homework-title"
          className="mt-3 text-center text-xl font-medium text-[#7C4157]"
        >
          งานใกล้ถึงกำหนดส่ง
        </h2>
        <p className="mt-1 text-center text-xs text-[#936879]">
          เหลือเวลาไม่เกิน 1 วัน จำนวน {tasks.length} งาน
        </p>

        <div className="mt-5 max-h-[310px] space-y-3 overflow-y-auto pr-1">
          {tasks.map((task) => (
            <article
              key={task.workload_id}
              className="rounded-2xl border border-[#E8CDD5] bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex items-start gap-2 text-sm">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-[#6FA7C1]" />
                <div className="min-w-0">
                  <p className="text-[11px] text-[#8A9DA6]">วิชา</p>
                  <p className="truncate font-medium text-[#426273]">
                    {task.subject_name || "ไม่ระบุวิชา"}
                  </p>
                </div>
              </div>
              <div className="mt-2 border-t border-[#F2E2E7] pt-2">
                <p className="text-[11px] text-[#8A9DA6]">ชื่องาน</p>
                <p className="text-sm font-medium text-[#6E4856]">
                  {task.workload_name}
                </p>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-[#A0526E]">
                <Clock3 className="h-4 w-4 shrink-0" />
                <span>
                  กำหนดส่ง {formatDisplayDate(task.deadline)} เวลา{" "}
                  {formatDisplayTime(task.deadline)} น.
                </span>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onViewAll}
            className="min-h-9 rounded-full border border-[#D890A8] bg-[#F6B9CC] px-4 text-xs font-medium text-[#794257] transition hover:bg-[#E99EB6]"
          >
            ดูงานทั้งหมด
          </button>
          {permission !== "granted" && (
            <button
              type="button"
              onClick={onNotificationSettings}
              className="min-h-9 rounded-full border border-[#9FC7D9] bg-[#DDF3FF] px-4 text-xs text-[#527487] transition hover:bg-[#BFE7FA]"
            >
              ตั้งค่าการแจ้งเตือน
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-9 rounded-full border border-[#C8B9BE] bg-white px-4 text-xs text-[#6B5F63] transition hover:bg-[#F8E9EE]"
          >
            รับทราบ
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}
