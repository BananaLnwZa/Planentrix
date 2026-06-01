"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/services/auth.store";
import { useEffect } from "react";

export default function MainPage() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/LogIn");
    }
  }, [isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/LogIn");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div
      className="
        min-h-screen
        bg-[url('/images/bg.png')]
        bg-cover
        bg-center
        flex
        items-center
        justify-center
        p-8
      "
    >
      <div className="bg-white/70 rounded-2xl p-8 shadow-md backdrop-blur-sm">
        <h1 className="text-4xl font-bold text-center mb-4 text-gray-800">
          Main Page
        </h1>
        
        {user && (
          <div className="text-center mb-6">
            <p className="text-gray-700 mb-2">
              Welcome, <span className="font-semibold">{user.username || `User ${user.userId}`}</span>!
            </p>
            <p className="text-sm text-gray-600">Role: {user.role}</p>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="
            w-full
            rounded-full
            border
            border-red-300
            bg-red-50
            px-6
            py-3
            text-base
            font-medium
            text-red-600
            shadow-sm
            transition-all
            duration-300
            hover:bg-red-100
            hover:shadow-lg
            hover:scale-105
            active:scale-95
          "
        >
          Logout (Temporary)
        </button>
      </div>
    </div>
  );
}