"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/services/auth.store";
import authService from "@/services/auth.service";
import { redirectToRoleHome } from "@/services/role-navigation";
import MainNotebook from "./MainNotebook";
import NotebookTabs, { type NotebookTabId } from "./NotebookTabs";
import termService from "@/services/term.service";

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
  const { user, accessToken, isAuthenticated, checkAuthStatus } = useAuthStore();
  const [postFinal, setPostFinal] = useState(false);

  useEffect(() => {
    let active = true;
    const refreshWorkflow = () => {
      void termService.getWorkflow().then((workflow) => {
        if (active) setPostFinal(Boolean(workflow?.post_final));
      }).catch(() => {
        if (active) setPostFinal(false);
      });
    };
    refreshWorkflow();
    window.addEventListener("focus", refreshWorkflow);
    window.addEventListener("term-workflow-updated", refreshWorkflow);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshWorkflow);
      window.removeEventListener("term-workflow-updated", refreshWorkflow);
    };
  }, []);

  useEffect(() => {
    if (postFinal && activeTab !== "main") router.replace("/Main");
  }, [activeTab, postFinal, router]);

  useEffect(() => {
    const validateSession = () => {
      checkAuthStatus();

      if (!authService.isAuthenticated()) {
        router.replace("/LogIn");
        return;
      }

      const session = authService.getSession();
      if (session?.user.role !== "user") {
        if (session && redirectToRoleHome(session.user.role)) return;
        authService.clearAuth();
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

  const handleTabChange = (tab: NotebookTabId) => {
    router.push(tabRoutes[tab]);
  };

  if (!accessToken || !isAuthenticated || user?.role !== "user") {
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
        p-2
        sm:p-4
        md:p-8
      "
    >
      <MainNotebook
        boundedContent={activeTab === "score"}
        tabs={
          postFinal ? null : (
            <NotebookTabs activeTab={activeTab} onTabChange={handleTabChange} />
          )
        }
      >
        {postFinal && activeTab !== "main" ? (
          <div className="flex h-full items-center justify-center text-sm text-[#6A8795]">
            สิ้นสุดเทอมแล้ว กำลังเปิดหน้าสรุปพฤติกรรมการเรียน...
          </div>
        ) : children}
      </MainNotebook>
    </div>
  );
}
