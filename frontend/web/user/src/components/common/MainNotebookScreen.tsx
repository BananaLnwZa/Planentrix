"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/services/auth.store";
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
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/LogIn");
    }
  }, [isAuthenticated, router]);

  const handleTabChange = (tab: NotebookTabId) => {
    router.push(tabRoutes[tab]);
  };

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
