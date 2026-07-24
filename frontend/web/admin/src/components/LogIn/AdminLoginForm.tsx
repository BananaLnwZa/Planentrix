"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import adminAuthService from "@/services/auth.service";
import AdminLoginButton from "./AdminLoginButton";

const adminLoginSchema = z.object({
  admin_name: z
    .string()
    .trim()
    .min(1, "Username is required")
    .min(3, "Username must be at least 3 characters"),
  admin_password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

export default function AdminLoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: AdminLoginFormData) => {
    setFormError(null);

    try {
      await adminAuthService.login(data);
      router.replace("/Main");
    } catch (error: unknown) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Login failed. Please try again.",
      );
    }
  };

  return (
    <div className="w-full rounded-[26px] border border-white/90 bg-white/82 px-6 py-7 shadow-[0_24px_65px_rgba(73,111,132,0.18),0_3px_10px_rgba(73,111,132,0.1)] backdrop-blur-xl sm:px-10 sm:py-9">
      <header className="mb-7 text-center">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.24em] text-[#79a8bc]">
          Administrator portal
        </p>
        <h1
          id="admin-login-title"
          className="text-[32px] font-normal tracking-[-0.02em] text-[#2d3740]"
        >
          Log in
        </h1>
      </header>

      {formError && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-[#efb8ae] bg-[#fff4f1] px-4 py-3 text-sm text-[#a54e40]"
        >
          {formError}
        </div>
      )}

      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-5">
          <div>
            <label
              htmlFor="admin-name"
              className="mb-2 block text-sm text-[#47545c]"
            >
              Username
            </label>
            <input
              id="admin-name"
              type="text"
              autoComplete="username"
              placeholder="Enter admin username"
              aria-invalid={Boolean(errors.admin_name)}
              aria-describedby={
                errors.admin_name ? "admin-name-error" : undefined
              }
              {...register("admin_name")}
              className={`h-11 w-full rounded-full border bg-white/75 px-4 text-sm text-[#2d3740] outline-none transition duration-200 placeholder:text-[#a3adb3] focus:bg-white focus:ring-4 ${
                errors.admin_name
                  ? "border-[#dc7769] focus:border-[#dc7769] focus:ring-[#f7d6d0]/50"
                  : "border-[#c9d8df] focus:border-[#79b7cf] focus:ring-[#ccebf5]/55"
              }`}
            />
            {errors.admin_name && (
              <p
                id="admin-name-error"
                className="mt-1.5 pl-3 text-xs text-[#bd5548]"
              >
                {errors.admin_name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="mb-2 block text-sm text-[#47545c]"
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter password"
              aria-invalid={Boolean(errors.admin_password)}
              aria-describedby={
                errors.admin_password ? "admin-password-error" : undefined
              }
              {...register("admin_password")}
              className={`h-11 w-full rounded-full border bg-white/75 px-4 text-sm text-[#2d3740] outline-none transition duration-200 placeholder:text-[#a3adb3] focus:bg-white focus:ring-4 ${
                errors.admin_password
                  ? "border-[#dc7769] focus:border-[#dc7769] focus:ring-[#f7d6d0]/50"
                  : "border-[#c9d8df] focus:border-[#79b7cf] focus:ring-[#ccebf5]/55"
              }`}
            />
            {errors.admin_password && (
              <p
                id="admin-password-error"
                className="mt-1.5 pl-3 text-xs text-[#bd5548]"
              >
                {errors.admin_password.message}
              </p>
            )}
          </div>

          <div className="pt-2">
            <AdminLoginButton isLoading={isSubmitting} />
          </div>
        </div>
      </form>

      <p className="mt-6 text-center text-xs tracking-wide text-[#849198]">
        Authorized administrators only
      </p>
    </div>
  );
}
