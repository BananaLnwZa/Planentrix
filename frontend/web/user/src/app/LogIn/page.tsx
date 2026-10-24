"use client";

import dynamic from "next/dynamic";
import LogoSection from "@/components/common/LogoSection";

const AuthNotebook = dynamic(() => import("@/components/common/AuthNotebook"), {
  ssr: false,
});

const LoginForm = dynamic(() => import("@/components/login/LoginForm"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[420px] w-full max-w-[450px] items-center justify-center rounded-2xl bg-white/70 p-4 shadow-md backdrop-blur-sm sm:p-6 md:min-h-[450px] md:p-10">
      <div className="text-gray-600">Loading...</div>
    </div>
  ),
});

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[url('/images/bg.png')] bg-cover bg-center p-2 sm:p-4 md:p-8">
      <AuthNotebook>
        <LogoSection />
        <LoginForm />
      </AuthNotebook>
    </div>
  );
}
