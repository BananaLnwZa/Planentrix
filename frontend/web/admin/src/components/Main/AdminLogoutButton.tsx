"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import adminAuthService from "@/services/auth.service";

export default function AdminLogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await adminAuthService.logout();
    } catch {
      // The service always clears the local token, even if the API is unavailable.
    } finally {
      router.replace("/LogIn");
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#d39a8b] bg-[#fff7f4] px-7 text-sm font-medium text-[#9b594a] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#fce9e3] hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f5d7cf] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-[#fff7f4] disabled:hover:shadow-sm"
    >
      <LogOut aria-hidden="true" size={17} strokeWidth={2} />
      {isLoggingOut ? "Logging out..." : "Log out"}
    </button>
  );
}
