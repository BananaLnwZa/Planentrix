"use client";

import { useState, useRef } from "react";
import { authService } from "@/services/auth.service";
import Notebook from "@/components/common/Notebook";
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
  time_preference: number | null;
}

// Interface for busy day data
interface BusyDayData {
  day: number;
  start: string;
  end: string;
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    }>;
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
      const payload: any = {
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
        time_preference: constraintData.constraints.time_preference,
      };

      if (constraintData.busyDays && constraintData.busyDays.length > 0) {
        payload.busy_days = constraintData.busyDays;
      }

      // Register
      const registerResponse = await authService.register(payload);

      setMessage({ type: "success", text: "สร้างบัญชีและบันทึกข้อมูลสำเร็จ!" });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "เกิดข้อผิดพลาดในการสร้างบัญชี",
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
      <Notebook>
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
      </Notebook>
    </div>
  );
}