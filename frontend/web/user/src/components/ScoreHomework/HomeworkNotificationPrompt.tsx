"use client";

import { BellRing, CircleAlert, Settings2, X } from "lucide-react";
import { createPortal } from "react-dom";
import type { HomeworkNotificationPermission } from "@/services/homework-reminder.service";

export default function HomeworkNotificationPrompt({
  permission,
  isRequesting,
  onEnable,
  onCheckAgain,
  onLater,
}: {
  permission: HomeworkNotificationPermission;
  isRequesting: boolean;
  onEnable: () => void;
  onCheckAgain: () => void;
  onLater: () => void;
}) {
  const isBlocked = permission === "denied";
  const isUnsupported = permission === "unsupported";

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#42525A]/35 p-4 backdrop-blur-[2px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="homework-notification-title"
        className="relative w-full max-w-[420px] rounded-[28px] border border-[#C7DCE8] bg-[#FFFBEA] px-7 py-7 text-[#3D505A] shadow-[0_14px_35px_rgba(61,80,90,0.25)]"
      >
        <button
          type="button"
          onClick={onLater}
          aria-label="ปิด"
          className="absolute right-5 top-5 rounded-full p-1 text-[#6D818C] transition hover:bg-white hover:text-[#3D505A]"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#9DCBE1] bg-[#DDF3FF] text-[#5E9FBE] shadow-sm">
          {isBlocked || isUnsupported ? (
            <CircleAlert className="h-8 w-8" />
          ) : (
            <BellRing className="h-8 w-8" />
          )}
        </div>

        <h2
          id="homework-notification-title"
          className="mt-4 text-center text-xl font-medium"
        >
          {isBlocked
            ? "การแจ้งเตือนถูกบล็อก"
            : isUnsupported
              ? "เบราว์เซอร์นี้ไม่รองรับ"
              : "เปิดแจ้งเตือนงานไหม?"}
        </h2>

        {isBlocked ? (
          <div className="mt-4 rounded-2xl border border-[#F0C4CF] bg-white/75 p-4 text-sm leading-6">
            <p className="font-medium">เปิดกลับได้ง่าย ๆ ดังนี้</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[#526975]">
              <li>กดไอคอนด้านซ้ายของช่อง URL</li>
              <li>เลือกการตั้งค่าเว็บไซต์</li>
              <li>เปลี่ยน Notifications เป็น Allow แล้วกลับมากดตรวจสอบ</li>
            </ol>
          </div>
        ) : (
          <p className="mt-3 text-center text-sm leading-6 text-[#607681]">
            {isUnsupported
              ? "แนะนำให้เปิด Planentrix ด้วย Chrome หรือ Edge ส่วนข้อความเตือนภายในหน้า Homework ยังใช้งานได้ตามปกติ"
              : "Planentrix จะแจ้งเตือนผ่าน Windows ก่อนถึงกำหนดส่งงาน 1 วัน และจะไม่ส่งแจ้งเตือนซ้ำ"}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {!isUnsupported && (
            <button
              type="button"
              disabled={isRequesting}
              onClick={isBlocked ? onCheckAgain : onEnable}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#7FB6D0] bg-[#BFE7FA] px-5 text-sm font-medium text-[#3D6172] transition hover:bg-[#91D2F0] disabled:cursor-wait disabled:opacity-60"
            >
              <Settings2 className="h-4 w-4" />
              {isRequesting
                ? "กำลังตรวจสอบ..."
                : isBlocked
                  ? "ตรวจสอบอีกครั้ง"
                  : "เปิดแจ้งเตือน"}
            </button>
          )}
          <button
            type="button"
            onClick={onLater}
            className="min-h-10 rounded-full border border-[#C8B9BE] bg-white px-5 text-sm text-[#6B5F63] transition hover:bg-[#F8E9EE]"
          >
            {isUnsupported ? "เข้าใจแล้ว" : "ไว้ภายหลัง"}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}
