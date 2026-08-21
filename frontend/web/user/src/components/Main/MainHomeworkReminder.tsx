"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import type { HomeworkTask } from "@/interfaces/homework.interface";
import homeworkService from "@/services/homework.service";
import homeworkReminderService from "@/services/homework-reminder.service";
import type { HomeworkNotificationPermission } from "@/services/homework-reminder.service";
import HomeworkNotificationPrompt from "@/components/ScoreHomework/HomeworkNotificationPrompt";
import UrgentHomeworkPopup from "./UrgentHomeworkPopup";

const PROMPT_DISMISSED_KEY = "homework-main-notification-prompt-dismissed";
const URGENT_POPUP_SEEN_KEY = "homework-main-urgent-popup-seen";

const urgentTaskSignature = (tasks: HomeworkTask[]) =>
  tasks
    .map((task) => `${task.workload_id}:${task.deadline.getTime()}`)
    .sort()
    .join("|");

export default function MainHomeworkReminder() {
  const [tasks, setTasks] = useState<HomeworkTask[]>([]);
  const [permission, setPermission] =
    useState<HomeworkNotificationPermission | "checking">("checking");
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isUrgentPopupOpen, setIsUrgentPopupOpen] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let active = true;
    const loadReminderState = async () => {
      try {
        const overview = await homeworkService.getHomeworkOverview();
        if (!active) return;
        const currentPermission = homeworkReminderService.getPermissionState();
        setTasks(overview.tasks);
        setPermission(currentPermission);
        await homeworkReminderService.syncTasks(overview.tasks);

        const urgent = overview.tasks.filter((task) => {
          const remaining = task.deadline.getTime() - Date.now();
          return remaining > 0 && remaining <= 24 * 60 * 60 * 1000;
        });
        if (
          urgent.length > 0 &&
          window.sessionStorage.getItem(URGENT_POPUP_SEEN_KEY) !==
            urgentTaskSignature(urgent)
        ) {
          setIsUrgentPopupOpen(true);
        }
      } catch {
        if (active) {
          setPermission(homeworkReminderService.getPermissionState());
        }
      }
    };

    void loadReminderState();
    const clockId = window.setInterval(() => setNow(new Date()), 60_000);
    return () => {
      active = false;
      window.clearInterval(clockId);
    };
  }, []);

  const urgentTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const remaining = task.deadline.getTime() - now.getTime();
        return remaining > 0 && remaining <= 24 * 60 * 60 * 1000;
      }),
    [now, tasks]
  );

  useEffect(() => {
    if (urgentTasks.length === 0) return;

    const timeoutId = window.setTimeout(() => {
      if (
        window.sessionStorage.getItem(URGENT_POPUP_SEEN_KEY) !==
        urgentTaskSignature(urgentTasks)
      ) {
        setIsUrgentPopupOpen(true);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [urgentTasks]);

  const openUrgentPopup = () => {
    setIsUrgentPopupOpen(true);
  };

  const openNotificationSettings = () => {
    setIsUrgentPopupOpen(false);
    window.sessionStorage.removeItem(PROMPT_DISMISSED_KEY);
    const currentPermission = homeworkReminderService.getPermissionState();
    setPermission(currentPermission);
    if (currentPermission === "granted") {
      homeworkReminderService.showReadyNotification();
      return;
    }
    setIsPromptOpen(true);
  };

  const closeUrgentPopup = () => {
    window.sessionStorage.setItem(
      URGENT_POPUP_SEEN_KEY,
      urgentTaskSignature(urgentTasks)
    );
    setIsUrgentPopupOpen(false);
  };

  const closePrompt = () => {
    window.sessionStorage.setItem(PROMPT_DISMISSED_KEY, "true");
    setIsPromptOpen(false);
  };

  const enableNotifications = async () => {
    setIsRequesting(true);
    const granted = await homeworkReminderService.requestPermission();
    const currentPermission = homeworkReminderService.getPermissionState();
    setPermission(currentPermission);
    if (granted) {
      await homeworkReminderService.syncTasks(tasks);
      homeworkReminderService.showReadyNotification();
      setIsPromptOpen(false);
    }
    setIsRequesting(false);
  };

  const checkPermission = async () => {
    const currentPermission = homeworkReminderService.getPermissionState();
    setPermission(currentPermission);
    if (currentPermission === "granted") {
      await homeworkReminderService.syncTasks(tasks);
      homeworkReminderService.showReadyNotification();
      setIsPromptOpen(false);
    }
  };

  const isGranted = permission === "granted";
  const isBlocked = permission === "denied";
  const isUrgent = urgentTasks.length > 0;
  const label = isUrgent
    ? `งานใกล้ส่ง ${urgentTasks.length} งาน`
    : isGranted
      ? "เปิดแจ้งเตือนแล้ว"
      : isBlocked
        ? "แจ้งเตือนถูกบล็อก"
        : "เปิดแจ้งเตือน";

  if (!isUrgent && !isPromptOpen && !isUrgentPopupOpen) return null;

  return (
    <>
      <div className="pointer-events-none absolute left-1/2 top-0 z-30 w-full max-w-[440px] -translate-x-1/2 -translate-y-8 md:-translate-y-[52px]">
        <button
          type="button"
          onClick={openUrgentPopup}
          title={
            isUrgent
              ? `${urgentTasks[0].subject_name} — ${urgentTasks[0].workload_name}`
              : label
          }
          className={`pointer-events-auto flex h-8 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-b-full rounded-t-none border px-3 text-[11px] shadow-sm transition hover:shadow-md ${
            isUrgent
              ? "border-[#E5A9B8] bg-[#FFF0F4] text-[#A55370]"
              : isGranted
                ? "border-[#9CCB9A] bg-[#E6F8D8] text-[#557A50]"
                : "border-[#A8C9D9] bg-white text-[#527487]"
          }`}
        >
          {isUrgent || isGranted ? (
            <BellRing className="h-3.5 w-3.5 shrink-0" />
          ) : isBlocked ? (
            <BellOff className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <Bell className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="truncate">{label}</span>
        </button>
      </div>

      {isUrgentPopupOpen && urgentTasks.length > 0 && (
        <UrgentHomeworkPopup
          tasks={urgentTasks}
          permission={permission}
          onClose={closeUrgentPopup}
          onNotificationSettings={openNotificationSettings}
          onViewAll={() => {
            closeUrgentPopup();
            window.location.assign("/Score&Homework");
          }}
        />
      )}

      {isPromptOpen && permission !== "checking" && (
        <HomeworkNotificationPrompt
          permission={permission}
          isRequesting={isRequesting}
          onEnable={() => void enableNotifications()}
          onCheckAgain={() => void checkPermission()}
          onLater={closePrompt}
        />
      )}
    </>
  );
}
