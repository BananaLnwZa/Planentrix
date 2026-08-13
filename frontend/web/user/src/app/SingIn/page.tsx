"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { authService } from "@/services/auth.service";
import type { RegisterRequest } from "@/interfaces/auth.interface";
import AuthNotebook from "@/components/common/AuthNotebook";
import LogoSection from "@/components/common/LogoSection";
import CreateAccForm from "@/components/SingIn/CreateAccForm";
import Constraint from "@/components/SingIn/constraintForm";
import SignInBtn from "@/components/SingIn/SignInBtn";

// Interface for constraint data
interface ConstraintFormData {
  day_off: number | null;
  continuous_working_duration: number | null;
  break: number | null;
  start_time: string | null;
  end_time: string | null;
}

// Interface for busy day data
interface BusyDayData {
  day: number;
  start: string;
  end: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Refs to access child component data
  const createAccFormRef = useRef<{
    getFormData: () => Promise<{
      user_name: string;
      user_password: string;
      user_birthdate: string | null;
      user_gender: "male" | "female" | "other" | null;
    } | null>;
  }>(null);

  const constraintFormRef = useRef<{
    getFormData: () => Promise<{
      constraints: ConstraintFormData;
      busyDays: BusyDayData[];
    } | null>;
  }>(null);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setMessage(null);

      // Get data from both forms
      const accData = await createAccFormRef.current?.getFormData?.();
      const constraintData = await constraintFormRef.current?.getFormData?.();

      if (!accData) {
        setMessage({ type: "error", text: "กรุณาตรวจสอบข้อมูลบัญชี" });
        return;
      }

      if (!constraintData) {
        setMessage({ type: "error", text: "กรุณาตรวจสอบข้อมูล Constraint" });
        return;
      }

      // Register user with all data
      const payload: RegisterRequest = {
        user_name: accData.user_name,
        user_password: accData.user_password,
        user_birthdate: accData.user_birthdate,
        user_gender: accData.user_gender,
        day_off: constraintData.constraints.day_off,
        continuous_working_duration:
          constraintData.constraints.continuous_working_duration,
        break: constraintData.constraints.break,
        start_time: constraintData.constraints.start_time,
        end_time: constraintData.constraints.end_time,
      };

      if (constraintData.busyDays && constraintData.busyDays.length > 0) {
        payload.busy_days = constraintData.busyDays;
      }

      // Register
      await authService.register(payload);

      setShowSuccessPopup(true);
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "เกิดข้อผิดพลาดในการสร้างบัญชี",
      });
    } finally {
      setIsLoading(false);
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
      {showSuccessPopup && (
        <div
          className="
            fixed
            inset-0
            z-[10000]
            flex
            items-center
            justify-center
            bg-black/40
            p-4
            backdrop-blur-[2px]
          "
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="signup-success-title"
            aria-describedby="signup-success-description"
            className="
              w-full
              max-w-sm
              rounded-3xl
              bg-white
              p-7
              text-center
              shadow-2xl
              sm:p-8
            "
          >
            <CheckCircle2
              aria-hidden="true"
              className="mx-auto mb-4 text-green-500"
              size={56}
              strokeWidth={1.8}
            />
            <h2
              id="signup-success-title"
              className="text-2xl font-medium text-gray-900"
            >
              สร้างบัญชีสำเร็จ
            </h2>
            <p
              id="signup-success-description"
              className="mt-2 text-sm text-gray-500"
            >
              บัญชีของคุณพร้อมใช้งานแล้ว
            </p>
            <button
              type="button"
              autoFocus
              onClick={() => router.replace("/LogIn")}
              className="
                mt-6
                min-w-32
                rounded-full
                bg-[#9CC5F9]
                px-7
                py-2.5
                text-sm
                text-white
                transition-colors
                hover:bg-[#82B4F2]
                focus-visible:outline-2
                focus-visible:outline-offset-2
                focus-visible:outline-[#9CC5F9]
              "
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

      <AuthNotebook>
        <LogoSection />

        {message && (
          <div
            className={`
              p-4
              rounded-lg
              mb-4
              text-center
              font-medium
              ${
                message.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }
            `}
          >
            {message.text}
          </div>
        )}

        <CreateAccForm ref={createAccFormRef} />
        <Constraint ref={constraintFormRef} />
        <SignInBtn
          onClick={handleSignIn}
          isLoading={isLoading}
          text={isLoading ? "กำลังบันทึก..." : "Sign In"}
        />
      </AuthNotebook>
    </div>
  );
}
