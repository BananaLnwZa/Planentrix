"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import AdminSelect from "@/components/ui/AdminSelect";

const adminSignInSchema = z.object({
  admin_name: z
    .string()
    .trim()
    .min(1, "Username is required")
    .min(3, "Username must be at least 3 characters")
    .regex(
      /^(?=.*[A-Za-z])[A-Za-z0-9]+$/,
      "Use letters and numbers, with at least one letter",
    ),
  admin_email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  admin_password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
  role: z.string().min(1, "Please select a role"),
  major: z.string(),
  first_name: z.string().trim(),
  last_name: z.string().trim(),
  phone_number: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d{10}$/.test(value),
      "Phone number must contain exactly 10 digits",
    ),
  address: z.string().trim(),
}).superRefine((data, context) => {
  if (data.role === "teacher" && !data.major) {
    context.addIssue({
      code: "custom",
      path: ["major"],
      message: "Please select a major",
    });
  }
});

const majorOptions = [
  {
    value: "COMSCI",
    label: "วิทยาการคอมพิวเตอร์ (COMSCI)",
    description: "Computer Science",
  },
  {
    value: "IT",
    label: "เทคโนโลยีสารสนเทศ (IT)",
    description: "Information Technology",
  },
  {
    value: "DS",
    label: "วิทยาการข้อมูล (DS)",
    description: "Data Science",
  },
];

type AdminSignInFormData = z.infer<typeof adminSignInSchema>;

const fieldClass = (invalid: boolean) =>
  `h-11 w-full rounded-full border bg-white/75 px-4 text-sm text-[#2d3740] outline-none transition duration-200 placeholder:text-[#a3adb3] focus:bg-white focus:ring-4 ${
    invalid
      ? "border-[#dc7769] focus:border-[#dc7769] focus:ring-[#f7d6d0]/50"
      : "border-[#c9d8df] focus:border-[#79b7cf] focus:ring-[#ccebf5]/55"
  }`;

export default function AdminSignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AdminSignInFormData>({
    resolver: zodResolver(adminSignInSchema),
    mode: "onBlur",
    defaultValues: {
      admin_name: "",
      admin_password: "",
      role: "",
      major: "",
      admin_email: "",
      first_name: "",
      last_name: "",
      phone_number: "",
      address: "",
    },
  });

  const onSubmit = () => {
    setPreviewReady(true);
  };

  const selectedRole = useWatch({ control, name: "role" });

  return (
    <section className="w-full max-w-[760px] rounded-[26px] border border-white/90 bg-white/82 px-6 py-7 shadow-[0_24px_65px_rgba(73,111,132,0.18),0_3px_10px_rgba(73,111,132,0.1)] backdrop-blur-xl sm:px-10 sm:py-9">
      <header className="mb-7 text-center">
        <h1 className="text-[30px] font-normal tracking-[-0.02em] text-[#2d3740] sm:text-[32px]">
          Sign in Admin
        </h1>
        <p className="mt-2 text-sm text-[#7a8a91]">
          สร้างบัญชีสำหรับผู้ดูแลระบบหรืออาจารย์
        </p>
      </header>

      <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-[#cbe4ee] bg-[#f2fbfe] px-4 py-3 text-sm text-[#47798c]">
        <Info aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
        <p>UI Preview — หน้านี้ยังไม่ได้เชื่อมต่อระบบบันทึกข้อมูล</p>
      </div>

      {previewReady && (
        <div
          role="status"
          className="mb-6 flex items-start gap-2.5 rounded-xl border border-[#b8dfd0] bg-[#f2fbf7] px-4 py-3 text-sm text-[#39765e]"
        >
          <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
          <p>ข้อมูลผ่านการตรวจสอบแล้ว แต่ยังไม่ได้บันทึกลงระบบ</p>
        </div>
      )}

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit, () => setPreviewReady(false))}
      >
        <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
          <FormField
            id="new-admin-username"
            label="Username"
            error={errors.admin_name?.message}
          >
            <input
              id="new-admin-username"
              type="text"
              autoComplete="off"
              placeholder="Enter admin username"
              aria-invalid={Boolean(errors.admin_name)}
              aria-describedby={
                errors.admin_name ? "new-admin-username-error" : undefined
              }
              {...register("admin_name", {
                onChange: () => setPreviewReady(false),
              })}
              className={fieldClass(Boolean(errors.admin_name))}
            />
          </FormField>

          <FormField
            id="new-admin-password"
            label="Password"
            error={errors.admin_password?.message}
          >
            <PasswordInput
              id="new-admin-password"
              visible={showPassword}
              onToggle={() => setShowPassword((previous) => !previous)}
              invalid={Boolean(errors.admin_password)}
              describedBy={
                errors.admin_password ? "new-admin-password-error" : undefined
              }
              registration={register("admin_password", {
                onChange: () => setPreviewReady(false),
              })}
              placeholder="Enter password"
            />
          </FormField>

          <FormField
            id="new-admin-role"
            label="Role"
            error={errors.role?.message}
          >
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <AdminSelect
                  value={field.value}
                  ariaLabel="เลือก Role"
                  placeholder="เลือก Role"
                  tone="violet"
                  options={[
                    {
                      value: "admin",
                      label: "ผู้ดูแลระบบ",
                      description: "จัดการข้อมูลและการตั้งค่าระบบ",
                    },
                    {
                      value: "teacher",
                      label: "อาจารย์",
                      description: "ดูแลรายวิชาและข้อสอบ",
                    },
                  ]}
                  onChange={(value) => {
                    field.onChange(value);
                    if (value !== "teacher") {
                      setValue("major", "", { shouldValidate: true });
                    }
                    setPreviewReady(false);
                  }}
                  className={errors.role ? "rounded-xl ring-1 ring-[#dc7769]" : ""}
                />
              )}
            />
          </FormField>

          {selectedRole === "teacher" && (
            <FormField
              id="new-admin-major"
              label="Major"
              error={errors.major?.message}
            >
              <Controller
                control={control}
                name="major"
                render={({ field }) => (
                  <AdminSelect
                    value={field.value}
                    ariaLabel="เลือก Major"
                    placeholder="เลือก Major"
                    options={majorOptions}
                    onChange={(value) => {
                      field.onChange(value);
                      setPreviewReady(false);
                    }}
                    className={
                      errors.major
                        ? "rounded-xl ring-1 ring-[#dc7769]"
                        : ""
                    }
                  />
                )}
              />
            </FormField>
          )}

          <FormField
            id="new-admin-email"
            label="Email"
            error={errors.admin_email?.message}
          >
            <input
              id="new-admin-email"
              type="email"
              autoComplete="off"
              placeholder="Enter admin email"
              aria-invalid={Boolean(errors.admin_email)}
              aria-describedby={
                errors.admin_email ? "new-admin-email-error" : undefined
              }
              {...register("admin_email", {
                onChange: () => setPreviewReady(false),
              })}
              className={fieldClass(Boolean(errors.admin_email))}
            />
          </FormField>

          <FormField
            id="new-admin-first-name"
            label="First Name (optional)"
            error={errors.first_name?.message}
          >
            <input
              id="new-admin-first-name"
              type="text"
              autoComplete="off"
              placeholder="Enter first name"
              {...register("first_name", {
                onChange: () => setPreviewReady(false),
              })}
              className={fieldClass(Boolean(errors.first_name))}
            />
          </FormField>

          <FormField
            id="new-admin-last-name"
            label="Last Name (optional)"
            error={errors.last_name?.message}
          >
            <input
              id="new-admin-last-name"
              type="text"
              autoComplete="off"
              placeholder="Enter last name"
              {...register("last_name", {
                onChange: () => setPreviewReady(false),
              })}
              className={fieldClass(Boolean(errors.last_name))}
            />
          </FormField>

          <FormField
            id="new-admin-phone"
            label="Phone Number (optional)"
            error={errors.phone_number?.message}
          >
            <input
              id="new-admin-phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              autoComplete="off"
              placeholder="Enter 10-digit phone number"
              aria-invalid={Boolean(errors.phone_number)}
              aria-describedby={
                errors.phone_number ? "new-admin-phone-error" : undefined
              }
              {...register("phone_number", {
                onChange: () => setPreviewReady(false),
              })}
              className={fieldClass(Boolean(errors.phone_number))}
            />
          </FormField>

          <FormField
            id="new-admin-address"
            label="Address (optional)"
            error={errors.address?.message}
          >
            <input
              id="new-admin-address"
              type="text"
              autoComplete="off"
              placeholder="Enter address"
              {...register("address", {
                onChange: () => setPreviewReady(false),
              })}
              className={fieldClass(Boolean(errors.address))}
            />
          </FormField>
        </div>

        <div className="mt-7 flex justify-center">
          <button
            type="submit"
            className="inline-flex h-11 min-w-48 items-center justify-center gap-2 rounded-full bg-[#8bc9df] px-6 text-sm font-medium text-white shadow-[0_8px_18px_rgba(80,157,186,0.22)] transition hover:-translate-y-0.5 hover:bg-[#78bad2] hover:shadow-[0_11px_22px_rgba(80,157,186,0.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#79b7cf]"
          >
            <UserPlus aria-hidden="true" size={18} strokeWidth={1.8} />
            Create Account
          </button>
        </div>
      </form>
    </section>
  );
}

function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-[#47545c]">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 pl-3 text-xs text-[#bd5548]">
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordInput({
  id,
  visible,
  onToggle,
  invalid,
  describedBy,
  registration,
  placeholder,
}: {
  id: string;
  visible: boolean;
  onToggle: () => void;
  invalid: boolean;
  describedBy?: string;
  registration: ReturnType<
    ReturnType<typeof useForm<AdminSignInFormData>>["register"]
  >;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        placeholder={placeholder}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        {...registration}
        className={`${fieldClass(invalid)} pr-12`}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center justify-center text-[#829097] transition-colors hover:text-[#47545c] focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#79b7cf]"
      >
        {visible ? (
          <EyeOff aria-hidden="true" size={18} strokeWidth={1.8} />
        ) : (
          <Eye aria-hidden="true" size={18} strokeWidth={1.8} />
        )}
      </button>
    </div>
  );
}
