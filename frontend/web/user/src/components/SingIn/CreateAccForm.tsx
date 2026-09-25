"use client";

import {
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import CustomSelect, {
  type CustomSelectOption,
} from "@/components/common/CustomSelect";
import GenderSelect from "@/components/common/GenderSelect";
import LocalizedDateTimeInput from "@/components/common/LocalizedDateTimeInput";
import type { FacultyOption } from "@/interfaces/auth.interface";
import authService from "@/services/auth.service";

const passwordRegex = /^(?=.*[A-Za-z])(?=.*[\W_]).{8,}$/;
const emailRegex = /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

type AccountField =
  | "username"
  | "firstName"
  | "lastName"
  | "email"
  | "faculty"
  | "department"
  | "password"
  | "confirmPassword"
  | "birthdate";
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
    first_name: string;
    last_name: string;
    email: string;
    department_id: number;
    user_password: string;
    user_birthdate: string | null;
    user_gender: "male" | "female" | "other" | null;
  } | null>;
}

const CreateAccForm = forwardRef<CreateAccFormHandle>(function CreateAccForm(_, ref) {
  const [errors, setErrors] = useState<AccountErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [faculties, setFaculties] = useState<FacultyOption[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [isOptionsLoading, setIsOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");

  const usernameRef = useRef<HTMLInputElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const birthdateRef = useRef<HTMLInputElement>(null);
  const [selectedGender, setSelectedGender] = useState<
    "male" | "female" | "other" | null
  >(null);

  const selectedFaculty = faculties.find(
    (faculty) => String(faculty.faculty_id) === selectedFacultyId
  );
  const availableDepartments = selectedFaculty?.departments ?? [];
  const facultyOptions: CustomSelectOption<string>[] = faculties.map(
    (faculty) => ({
      value: String(faculty.faculty_id),
      label: faculty.faculty_name,
    })
  );
  const departmentOptions: CustomSelectOption<string>[] =
    availableDepartments.map((department) => ({
      value: String(department.department_id),
      label: department.department_name,
    }));

  useEffect(() => {
    let isActive = true;

    authService
      .getRegistrationOptions()
      .then((response) => {
        if (!isActive) return;
        setFaculties(response.faculties);
        setOptionsError(
          response.faculties.length === 0
            ? "ยังไม่มีข้อมูลคณะและสาขา กรุณาติดต่อผู้ดูแลระบบ"
            : ""
        );
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setOptionsError(
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดข้อมูลคณะและสาขาได้"
        );
      })
      .finally(() => {
        if (isActive) setIsOptionsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

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
      const firstName = firstNameRef.current?.value?.trim() ?? "";
      const lastName = lastNameRef.current?.value?.trim() ?? "";
      const email = emailRef.current?.value?.trim() ?? "";
      const departmentId = Number(selectedDepartmentId);
      const password = passwordRef.current?.value ?? "";
      const confirmPassword = confirmPasswordRef.current?.value ?? "";
      const birthdate = birthdateRef.current?.value;
      const nextErrors: AccountErrors = {};

      if (!username) {
        nextErrors.username = "กรุณาป้อนชื่อผู้ใช้";
      }

      if (!firstName) {
        nextErrors.firstName = "กรุณาป้อนชื่อ";
      }

      if (!lastName) {
        nextErrors.lastName = "กรุณาป้อนนามสกุล";
      }

      if (!email) {
        nextErrors.email = "กรุณาป้อนอีเมล";
      } else if (!emailRegex.test(email)) {
        nextErrors.email = "รูปแบบอีเมลไม่ถูกต้อง";
      }

      if (!selectedFacultyId) {
        nextErrors.faculty = "กรุณาเลือกคณะ";
      }

      if (!Number.isInteger(departmentId) || departmentId <= 0) {
        nextErrors.department = "กรุณาเลือกสาขา";
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

      if (birthdate && birthdate > toLocalDateValue(new Date())) {
        nextErrors.birthdate = "วันเกิดต้องไม่เป็นวันในอนาคต";
      }

      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) {
        return null;
      }

      return {
        user_name: username,
        first_name: firstName,
        last_name: lastName,
        email,
        department_id: departmentId,
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
            username <span className="text-red-500" aria-hidden="true">*</span>
          </label>

          <input
            id="signup-username"
            ref={usernameRef}
            type="text"
            placeholder="Enter username"
            required
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

        {/* Student name */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label
              htmlFor="signup-first-name"
              className="mb-2 block text-xs text-gray-700 sm:text-sm"
            >
              First name <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="signup-first-name"
              ref={firstNameRef}
              type="text"
              placeholder="Enter first name"
              autoComplete="given-name"
              required
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby={
                errors.firstName ? "signup-first-name-error" : undefined
              }
              onChange={() => clearError("firstName")}
              className={`
                w-full rounded-full border px-4 py-2.5 text-[11px]
                text-gray-500 outline-none sm:px-5 sm:py-3 sm:text-[12px]
                md:text-[14px]
                ${
                  errors.firstName
                    ? "border-red-400 bg-red-50/40"
                    : "border-gray-300 bg-white"
                }
              `}
            />
            {errors.firstName && (
              <p
                id="signup-first-name-error"
                className="mt-1.5 text-xs text-red-600"
                role="alert"
              >
                {errors.firstName}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="signup-last-name"
              className="mb-2 block text-xs text-gray-700 sm:text-sm"
            >
              Last name <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="signup-last-name"
              ref={lastNameRef}
              type="text"
              placeholder="Enter last name"
              autoComplete="family-name"
              required
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby={
                errors.lastName ? "signup-last-name-error" : undefined
              }
              onChange={() => clearError("lastName")}
              className={`
                w-full rounded-full border px-4 py-2.5 text-[11px]
                text-gray-500 outline-none sm:px-5 sm:py-3 sm:text-[12px]
                md:text-[14px]
                ${
                  errors.lastName
                    ? "border-red-400 bg-red-50/40"
                    : "border-gray-300 bg-white"
                }
              `}
            />
            {errors.lastName && (
              <p
                id="signup-last-name-error"
                className="mt-1.5 text-xs text-red-600"
                role="alert"
              >
                {errors.lastName}
              </p>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="signup-email"
            className="mb-2 block text-xs text-gray-700 sm:text-sm"
          >
            Email <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="signup-email"
            ref={emailRef}
            type="email"
            placeholder="Enter email"
            autoComplete="email"
            required
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "signup-email-error" : undefined}
            onChange={() => clearError("email")}
            className={`
              w-full rounded-full border px-4 py-2.5 text-[11px]
              text-gray-500 outline-none sm:px-5 sm:py-3 sm:text-[12px]
              md:text-[14px]
              ${
                errors.email
                  ? "border-red-400 bg-red-50/40"
                  : "border-gray-300 bg-white"
              }
            `}
          />
          {errors.email && (
            <p
              id="signup-email-error"
              className="mt-1.5 text-xs text-red-600"
              role="alert"
            >
              {errors.email}
            </p>
          )}
        </div>

        {/* Faculty and department */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="signup-faculty"
              className="mb-2 block text-xs text-gray-700 sm:text-sm"
            >
              คณะ <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <CustomSelect
              id="signup-faculty"
              value={selectedFacultyId}
              options={facultyOptions}
              required
              disabled={isOptionsLoading || faculties.length === 0}
              ariaLabel="เลือกคณะ"
              ariaInvalid={Boolean(errors.faculty)}
              wrapOptions
              placeholder={isOptionsLoading ? "กำลังโหลด..." : "เลือกคณะ"}
              onChange={(value) => {
                setSelectedFacultyId(value);
                setSelectedDepartmentId("");
                clearError("faculty");
                clearError("department");
              }}
              buttonClassName={errors.faculty ? "bg-red-50/40" : ""}
            />
            {errors.faculty && (
              <p
                id="signup-faculty-error"
                className="mt-1.5 text-xs text-red-600"
                role="alert"
              >
                {errors.faculty}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="signup-department"
              className="mb-2 block text-xs text-gray-700 sm:text-sm"
            >
              สาขา <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <CustomSelect
              id="signup-department"
              value={selectedDepartmentId}
              options={departmentOptions}
              required
              disabled={
                !selectedFacultyId || availableDepartments.length === 0
              }
              ariaLabel="เลือกสาขา"
              ariaInvalid={Boolean(errors.department)}
              wrapOptions
              placeholder={
                !selectedFacultyId
                  ? "เลือกคณะก่อน"
                  : availableDepartments.length === 0
                    ? "คณะนี้ยังไม่มีสาขา"
                    : "เลือกสาขา"
              }
              onChange={(value) => {
                setSelectedDepartmentId(value);
                clearError("department");
              }}
              buttonClassName={errors.department ? "bg-red-50/40" : ""}
            />
            {errors.department && (
              <p
                id="signup-department-error"
                className="mt-1.5 text-xs text-red-600"
                role="alert"
              >
                {errors.department}
              </p>
            )}
          </div>
        </div>

        {optionsError && (
          <p className="text-xs text-red-600" role="alert">
            {optionsError}
          </p>
        )}

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
            password <span className="text-red-500" aria-hidden="true">*</span>
          </label>

          <div className="relative">
            <input
              id="signup-password"
              ref={passwordRef}
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              minLength={8}
              required
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
            Confirm Password <span className="text-red-500" aria-hidden="true">*</span>
          </label>

          <div className="relative">
            <input
              id="signup-confirm-password"
              ref={confirmPasswordRef}
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm password"
              minLength={8}
              required
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
            label="gender (optional)"
            onChange={setSelectedGender}
          />
        </div>
      </div>
    </div>
  );
});

export default CreateAccForm;
