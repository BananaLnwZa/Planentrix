"use client";

import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import SelectGender from "./SelectGender";

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

      if (password.length < 6) {
        setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
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
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
            >
              {showPassword ? "隐" : "显"}
            </button>
          </div>
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
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
            >
              {showConfirmPassword ? "隐" : "显"}
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
            <input
              ref={birthdateRef}
              type="date"
              className="
                custom-date
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