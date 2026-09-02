"use client";

import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Eye, EyeOff } from "lucide-react";
import GenderSelect from "@/components/common/GenderSelect";
import LocalizedDateTimeInput from "@/components/common/LocalizedDateTimeInput";

const passwordRegex = /^(?=.*[A-Za-z])(?=.*[\W_]).{8,}$/;

type AccountField =
  | "username"
  | "password"
  | "confirmPassword"
  | "birthdate"
  | "gender";
type AccountErrors = Partial<Record<AccountField, string>>;

const toLocalDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export interface CreateAccFormHandle {
  getFormData: () => Promise<{
    user_name: string;
    user_password: string;
    user_birthdate: string | null;
    user_gender: "male" | "female" | "other" | null;
  } | null>;
}

const CreateAccForm = forwardRef<CreateAccFormHandle>(function CreateAccForm(_, ref) {
  const [errors, setErrors] = useState<AccountErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const birthdateRef = useRef<HTMLInputElement>(null);
  const [selectedGender, setSelectedGender] = useState<
    "male" | "female" | "other" | null
  >(null);

  const clearError = (field: AccountField) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  useImperativeHandle(ref, () => ({
    getFormData: async () => {
      const username = usernameRef.current?.value?.trim() ?? "";
      const password = passwordRef.current?.value ?? "";
      const confirmPassword = confirmPasswordRef.current?.value ?? "";
      const birthdate = birthdateRef.current?.value;
      const nextErrors: AccountErrors = {};

      if (!username) {
        nextErrors.username = "กรุณาป้อนชื่อผู้ใช้";
      }

      if (!password) {
        nextErrors.password = "กรุณาป้อนรหัสผ่าน";
      } else if (!passwordRegex.test(password)) {
        nextErrors.password =
          "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และต้องมีตัวอักษรภาษาอังกฤษกับอักขระพิเศษอย่างน้อยอย่างละ 1 ตัว";
      }

      if (!confirmPassword) {
        nextErrors.confirmPassword = "กรุณายืนยันรหัสผ่าน";
      } else if (password && password !== confirmPassword) {
        nextErrors.confirmPassword = "รหัสผ่านไม่ตรงกัน";
      }

      if (!selectedGender) {
        nextErrors.gender = "กรุณาเลือกเพศ";
      }

      if (birthdate && birthdate > toLocalDateValue(new Date())) {
        nextErrors.birthdate = "วันเกิดต้องไม่เป็นวันในอนาคต";
      }

      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) {
        return null;
      }

      return {
        user_name: username,
        user_password: password,
        user_birthdate: birthdate || null,
        user_gender: selectedGender!,
      };
    },
  }));
  return (
    <div
      className="
        w-full
        max-w-[500px]

        min-h-[420px]
        md:min-h-[450px]

        rounded-2xl
        bg-white/70

        p-6
        sm:p-8
        md:p-10

        shadow-md
        backdrop-blur-sm
      "
    >
      <h2
        className="
          mb-6
          text-center
          text-3xl
          font-medium
          text-black

          sm:text-4xl
          md:mb-8
        "
      >
        Create Account
      </h2>

      <div className="space-y-4 md:space-y-5">
        {Object.keys(errors).length > 0 && (
          <div
            className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            กรุณาตรวจสอบข้อมูลในช่องที่ระบุด้านล่าง
          </div>
        )}

        {/* Username */}
        <div>
          <label
            htmlFor="signup-username"
            className="
              mb-2
              block
              text-xs
              text-gray-700

              sm:text-sm
            "
          >
            username
          </label>

          <input
            id="signup-username"
            ref={usernameRef}
            type="text"
            placeholder="Enter username"
            aria-invalid={Boolean(errors.username)}
            aria-describedby={errors.username ? "signup-username-error" : undefined}
            onChange={() => clearError("username")}
            className={`
              w-full

              rounded-full
              border
              ${errors.username ? "border-red-400 bg-red-50/40" : "border-gray-300 bg-white"}

              px-4
              py-2.5

              text-[11px]
              text-gray-500
              outline-none

              sm:px-5
              sm:py-3
              sm:text-[12px]

              md:text-[14px]
            `}
          />
          {errors.username && (
            <p id="signup-username-error" className="mt-1.5 text-xs text-red-600" role="alert">
              {errors.username}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="signup-password"
            className="
              mb-2
              block
              text-xs
              text-gray-700

              sm:text-sm
            "
          >
            password
          </label>

          <div className="relative">
            <input
              id="signup-password"
              ref={passwordRef}
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              minLength={8}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "signup-password-error" : "signup-password-help"}
              onChange={() => clearError("password")}
              className={`
                w-full

                rounded-full
                border
                ${errors.password ? "border-red-400 bg-red-50/40" : "border-gray-300 bg-white"}

                px-4
                py-2.5
                pr-10

                text-[11px]
                text-gray-500
                outline-none
                disabled:bg-gray-100
                disabled:cursor-not-allowed

                sm:px-5
                sm:py-3
                sm:text-[12px]

                md:text-[14px]
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
          <p id="signup-password-help" className="mt-1.5 text-[11px] text-gray-400 sm:text-xs">
            อย่างน้อย 8 ตัวอักษร และต้องมีตัวอักษรภาษาอังกฤษกับอักขระพิเศษ
          </p>
          {errors.password && (
            <p id="signup-password-error" className="mt-1.5 text-xs text-red-600" role="alert">
              {errors.password}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="signup-confirm-password"
            className="
              mb-2
              block
              text-xs
              text-gray-700

              sm:text-sm
            "
          >
            Confirm Password
          </label>

          <div className="relative">
            <input
              id="signup-confirm-password"
              ref={confirmPasswordRef}
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm password"
              minLength={8}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? "signup-confirm-password-error" : undefined}
              onChange={() => clearError("confirmPassword")}
              className={`
                w-full

                rounded-full
                border
                ${errors.confirmPassword ? "border-red-400 bg-red-50/40" : "border-gray-300 bg-white"}

                px-4
                py-2.5
                pr-10

                text-[11px]
                text-gray-500
                outline-none
                disabled:bg-gray-100
                disabled:cursor-not-allowed

                sm:px-5
                sm:py-3
                sm:text-[12px]

                md:text-[14px]
              `}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((previous) => !previous)}
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
              title={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
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
              {showConfirmPassword ? (
                <EyeOff aria-hidden="true" size={19} strokeWidth={1.8} />
              ) : (
                <Eye aria-hidden="true" size={19} strokeWidth={1.8} />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p id="signup-confirm-password-error" className="mt-1.5 text-xs text-red-600" role="alert">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {/* Birth Date */}
        <div>
          <label
            className="
              mb-2
              block
              text-xs
              text-gray-700
              sm:text-sm
            "
          >
            Birth Date
          </label>

          <div className="w-1/2 min-w-[180px]">
            <LocalizedDateTimeInput
              ref={birthdateRef}
              type="date"
              max={toLocalDateValue(new Date())}
              aria-invalid={Boolean(errors.birthdate)}
              aria-describedby={errors.birthdate ? "signup-birthdate-error" : undefined}
              onChange={() => clearError("birthdate")}
              className="
                h-[44px]
                w-full
                rounded-full
                border
                border-gray-300
                bg-white
                px-4
                text-[12px]
                text-gray-400
                outline-none


                sm:h-[48px]
                sm:px-5
                sm:text-[14px]
              "
            />
            {errors.birthdate && (
              <p
                id="signup-birthdate-error"
                className="mt-1.5 text-xs text-red-600"
                role="alert"
              >
                {errors.birthdate}
              </p>
            )}
          </div>
        </div>

        {/* Select Gender */}
        <div className="w-full sm:w-1/2">
          <GenderSelect
            value={selectedGender}
            onChange={(value) => {
              setSelectedGender(value);
              clearError("gender");
            }}
          />
          {errors.gender && (
            <p className="mt-1.5 text-xs text-red-600" role="alert">
              {errors.gender}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

export default CreateAccForm;
