"use client";

import dynamic from "next/dynamic";
import LogoSection from "@/components/common/LogoSection";

const Notebook = dynamic(() => import("@/components/common/Notebook"), {
  ssr: false,
});

const LoginForm = dynamic(() => import("@/components/login/LoginForm"), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-[450px] min-h-[420px] md:min-h-[450px] rounded-2xl bg-white/70 p-6 sm:p-8 md:p-10 shadow-md backdrop-blur-sm flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>
  ),
});

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[url('/images/bg.png')] bg-cover bg-center flex items-center justify-center p-8">
      <Notebook>
        <LogoSection />
        <LoginForm />
      </Notebook>
    </div>
  );
}