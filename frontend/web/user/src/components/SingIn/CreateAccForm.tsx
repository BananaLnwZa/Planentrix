"use client";

import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Eye, EyeOff } from "lucide-react";
import SelectGender from "./SelectGender";
import LocalizedDateTimeInput from "@/components/common/LocalizedDateTimeInput";

const passwordRegex = /^(?=.*[A-Za-z])(?=.*[\W_]).{8,}$/;

export interface CreateAccFormHandle {
  getFormData: () => Promise<{
    user_name: string;
    user_password: string;
    user_birthdate: string | null;
    user_gender: "male" | "female" | "other" | null;
  } | null>;
}

const CreateAccForm = forwardRef<CreateAccFormHandle>(function CreateAccForm(_, ref) {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const birthdateRef = useRef<HTMLInputElement>(null);
  const [selectedGender, setSelectedGender] = useState<
    "male" | "female" | "other" | null
  >(null);

  useImperativeHandle(ref, () => ({
    getFormData: async () => {
      setError(null);

      // Validation
      const username = usernameRef.current?.value?.trim();
      const password = passwordRef.current?.value;
      const confirmPassword = confirmPasswordRef.current?.value;
      const birthdate = birthdateRef.current?.value;

      if (!username) {
        setError("กรุณาป้อนชื่อผู้ใช้");
        return null;
      }

      if (!password) {
        setError("กรุณาป้อนรหัสผ่าน");
        return null;
      }

      if (!passwordRegex.test(password)) {
        setError(
          "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และต้องมีตัวอักษรภาษาอังกฤษกับอักขระพิเศษอย่างน้อยอย่างละ 1 ตัว"
        );
        return null;
      }

      if (password !== confirmPassword) {
        setError("รหัสผ่านไม่ตรงกัน");
        return null;
      }

      if (!selectedGender) {
        setError("กรุณาเลือกเพศ");
        return null;
      }

      return {
        user_name: username,
        user_password: password,
        user_birthdate: birthdate || null,
        user_gender: selectedGender,
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
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
            {error}
          </div>
        )}

        {/* Username */}
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
            username
          </label>

          <input
            ref={usernameRef}
            type="text"
            placeholder="Enter username"
            className="
              w-full

              rounded-full
              border
              border-gray-300
              bg-white

              px-4
              py-2.5

              text-[11px]
              text-gray-500
              outline-none

              sm:px-5
              sm:py-3
              sm:text-[12px]

              md:text-[14px]
            "
          />
        </div>

        {/* Password */}
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
            password
          </label>

          <div className="relative">
            <input
              ref={passwordRef}
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              minLength={8}
              autoComplete="new-password"
              className="
                w-full

                rounded-full
                border
                border-gray-300
                bg-white

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
              "
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
          <p className="mt-1.5 text-[11px] text-gray-400 sm:text-xs">
            อย่างน้อย 8 ตัวอักษร และต้องมีตัวอักษรภาษาอังกฤษกับอักขระพิเศษ
          </p>
        </div>

        {/* Confirm Password */}
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
            Confirm Password
          </label>

          <div className="relative">
            <input
              ref={confirmPasswordRef}
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm password"
              minLength={8}
              autoComplete="new-password"
              className="
                w-full

                rounded-full
                border
                border-gray-300
                bg-white

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
              "
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
          </div>
        </div>

        {/* Select Gender */}
        <div className="w-full sm:w-1/2">
          <SelectGender
            value={selectedGender}
            onChange={setSelectedGender}
          />
        </div>
      </div>
    </div>
  );
});

export default CreateAccForm;
