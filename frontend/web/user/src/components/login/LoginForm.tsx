"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/services/auth.store";
import { useEffect, useState } from "react";
import Link from "next/link";
import LoginBtn from "./LoginBtn";

// Validation schema
const loginSchema = z.object({
  user_name: z
    .string()
    .min(1, "Username is required")
    .min(3, "Username must be at least 3 characters"),
  user_password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const { login, isLoading, error: authError, isAuthenticated } = useAuthStore();
  const [formError, setFormError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  // Fix hydration issue
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isMounted && isAuthenticated) {
      router.push("/Main");
    }
  }, [isAuthenticated, router, isMounted]);

  const onSubmit = async (data: LoginFormData) => {
    setFormError(null);

    try {
      await login(data.user_name, data.user_password);
      reset();
      router.push("/Main");
    } catch (err: any) {
      setFormError(err?.message || "Login failed. Please try again.");
    }
  };

  const displayError = formError || authError;

  if (!isMounted) {
    return (
      <div className="w-full max-w-[450px] min-h-[420px] md:min-h-[450px] rounded-2xl bg-white/70 p-6 sm:p-8 md:p-10 shadow-md backdrop-blur-sm">
        <h2 className="mb-6 md:mb-8 text-center text-3xl sm:text-4xl font-medium text-black">
          LogIn
        </h2>
        <div className="text-center text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[450px] min-h-[420px] md:min-h-[450px] rounded-2xl bg-white/70 p-6 sm:p-8 md:p-10 shadow-md backdrop-blur-sm">
      <h2
        className="
          mb-6
          md:mb-8

          text-center

          text-3xl
          sm:text-4xl

          font-medium
          text-black
        "
      >
        LogIn
      </h2>

      {/* Error Message */}
      {displayError && (
        <div
          className="
            mb-4
            p-3
            rounded-lg
            bg-red-100
            border
            border-red-400
            text-red-700
            text-xs
            sm:text-sm
          "
        >
          {displayError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4 md:space-y-5">
          {/* Username */}
          <div>
            <label
              className="
                mb-2
                block

                text-xs
                sm:text-sm

                text-gray-700
              "
            >
              username
            </label>

            <input
              type="text"
              placeholder="Enter username"
              {...register("user_name")}
              className={`
                w-full

                rounded-full
                border
                ${errors.user_name ? "border-red-500" : "border-gray-300"}

                px-4
                py-2.5

                sm:px-5
                sm:py-3

                outline-none

                text-[11px]
                sm:text-[12px]
                md:text-[14px]

                text-gray-500

                transition-colors
                duration-200

                focus:border-blue-500
                focus:bg-white
              `}
            />
            {errors.user_name && (
              <p className="mt-1 text-xs text-red-500">
                {errors.user_name.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              className="
                mb-2
                block

                text-xs
                sm:text-sm

                text-gray-700
              "
            >
              password
            </label>

            <input
              type="password"
              placeholder="Enter password"
              {...register("user_password")}
              className={`
                w-full

                rounded-full
                border
                ${errors.user_password ? "border-red-500" : "border-gray-300"}

                px-4
                py-2.5

                sm:px-5
                sm:py-3

                outline-none

                text-[11px]
                sm:text-[12px]
                md:text-[14px]

                text-gray-500

                transition-colors
                duration-200

                focus:border-blue-500
                focus:bg-white
              `}
            />
            {errors.user_password && (
              <p className="mt-1 text-xs text-red-500">
                {errors.user_password.message}
              </p>
            )}
          </div>

          {/* Button */}
          <div className="pt-3 md:pt-4 text-center">
            <LoginBtn isLoading={isLoading} />
          </div>
        </div>
      </form>

      {/* Sign In */}
      <p
        className="
          mt-6
          md:mt-10

          text-center

          text-xs
          sm:text-sm

          text-gray-600
        "
      >
        Don&apos;t have an account? | {" "}

        <Link
          href="/SingIn"
          className="
            underline

            transition-colors
            duration-300

            hover:text-[#9CC5F9]

            text-xs
            sm:text-sm
            md:text-base
          "
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}