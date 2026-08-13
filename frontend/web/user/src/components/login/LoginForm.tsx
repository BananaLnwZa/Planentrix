"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/services/auth.store";
import authService from "@/services/auth.service";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import LoginBtn from "./LoginBtn";

// Validation schema
const loginSchema = z.object({
  user_name: 
  z.string()
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
  const {
    login,
    isLoading,
    error: authError,
    isAuthenticated,
    checkAuthStatus,
  } = useAuthStore();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  useEffect(() => {
    const syncSession = () => checkAuthStatus();

    syncSession();
    window.addEventListener("focus", syncSession);
    window.addEventListener("storage", syncSession);

    return () => {
      window.removeEventListener("focus", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, [checkAuthStatus]);

  // Redirect only when the persisted state is backed by a real token.
  useEffect(() => {
    if (isAuthenticated && authService.getAccessToken()) {
      router.replace("/Main");
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (data: LoginFormData) => {
    setFormError(null);

    try {
      await login(data.user_name, data.user_password);
      reset();
      router.push("/Main");
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Login failed. Please try again."
      );
    }
  };

  const displayError = formError || authError;

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

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                autoComplete="current-password"
                {...register("user_password")}
                className={`
                  w-full

                  rounded-full
                  border
                  ${errors.user_password ? "border-red-500" : "border-gray-300"}

                  px-4
                  py-2.5
                  pr-12

                  sm:px-5
                  sm:py-3
                  sm:pr-12

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
              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                className="
                  absolute
                  right-4
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                  transition-colors
                  hover:text-gray-600
                  focus-visible:outline-2
                  focus-visible:outline-offset-2
                  focus-visible:outline-[#9CC5F9]
                "
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" size={19} strokeWidth={1.8} />
                ) : (
                  <Eye aria-hidden="true" size={19} strokeWidth={1.8} />
                )}
              </button>
            </div>
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
