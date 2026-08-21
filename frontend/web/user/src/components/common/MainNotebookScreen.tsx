"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/services/auth.store";
import authService from "@/services/auth.service";
import homeworkService from "@/services/homework.service";
import homeworkReminderService from "@/services/homework-reminder.service";
import MainNotebook from "./MainNotebook";
import NotebookTabs, { type NotebookTabId } from "./NotebookTabs";

const tabRoutes: Record<NotebookTabId, string> = {
  main: "/Main",
  score: "/Score&Homework",
  timer: "/Timer",
  test: "/Test",
};

export default function MainNotebookScreen({
  activeTab,
  children,
}: {
  activeTab: NotebookTabId;
  children?: ReactNode;
}) {
  const router = useRouter();
  const { accessToken, isAuthenticated, checkAuthStatus } = useAuthStore();

  useEffect(() => {
    const validateSession = () => {
      checkAuthStatus();

      if (!authService.isAuthenticated()) {
        router.replace("/LogIn");
      }
    };

    const validateVisibleSession = () => {
      if (document.visibilityState === "visible") validateSession();
    };

    validateSession();

    const intervalId = window.setInterval(validateSession, 60_000);
    window.addEventListener("focus", validateSession);
    window.addEventListener("storage", validateSession);
    document.addEventListener("visibilitychange", validateVisibleSession);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", validateSession);
      window.removeEventListener("storage", validateSession);
      document.removeEventListener("visibilitychange", validateVisibleSession);
    };
  }, [checkAuthStatus, router]);

  useEffect(() => {
    if (!accessToken || !isAuthenticated) return;

    let active = true;
    const syncHomeworkReminders = async () => {
      try {
        const overview = await homeworkService.getHomeworkOverview();
        if (active) await homeworkReminderService.syncTasks(overview.tasks);
      } catch {
        // Reminder syncing must not block page navigation when the API is offline.
      }
    };
    const syncVisibleReminders = () => {
      if (document.visibilityState === "visible") {
        void syncHomeworkReminders();
      }
    };

    void syncHomeworkReminders();
    const intervalId = window.setInterval(syncHomeworkReminders, 5 * 60_000);
    window.addEventListener("focus", syncHomeworkReminders);
    document.addEventListener("visibilitychange", syncVisibleReminders);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", syncHomeworkReminders);
      document.removeEventListener("visibilitychange", syncVisibleReminders);
    };
  }, [accessToken, isAuthenticated]);

  const handleTabChange = (tab: NotebookTabId) => {
    router.push(tabRoutes[tab]);
  };

  if (!accessToken || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[url('/images/bg.png')] bg-cover bg-center">
        <span className="text-sm text-[#6A8795]">กำลังตรวจสอบการเข้าสู่ระบบ...</span>
      </div>
    );
  }

  return (
    <div
      className="
        flex
        min-h-screen
        items-center
        justify-center
        bg-[url('/images/bg.png')]
        bg-cover
        bg-center
        p-8
      "
    >
      <MainNotebook
        tabs={
          <NotebookTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        }
      >
        {children}
      </MainNotebook>
    </div>
  );
}
