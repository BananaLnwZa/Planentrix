"use client";

import { type FormEvent, type RefObject, useEffect, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import adminAuthService from "@/services/auth.service";

interface FirstLoginPasswordModalProps {
  instructorName: string;
  required: boolean;
}

const passwordPattern = /^(?=.*[A-Za-z])(?=.*[\W_]).{8,}$/;

export default function FirstLoginPasswordModal({
  instructorName,
  required,
}: FirstLoginPasswordModalProps) {
  const router = useRouter();
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(required);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setIsOpen(required);
  }, [required]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstInputRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!passwordPattern.test(newPassword)) {
      setError(
        "รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีตัวอักษรภาษาอังกฤษกับอักขระพิเศษ",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }

    setIsSaving(true);
    try {
      await adminAuthService.changeFirstLoginPassword(newPassword);
      setIsOpen(false);
      router.refresh();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองอีกครั้ง";
      setError(
        message ===
          "New password must be different from the temporary password"
          ? "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านชั่วคราว"
          : message,
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#29444f]/50 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-login-password-title"
      aria-describedby="first-login-password-description"
    >
      <div className="w-full max-w-[470px] overflow-hidden rounded-[30px] border border-white/80 bg-[#f9fdff] shadow-[0_32px_90px_rgba(37,70,82,0.28)]">
        <div className="bg-[linear-gradient(135deg,#d9f1f8_0%,#e9e6f8_100%)] px-6 pb-6 pt-7 text-center sm:px-8">
          <span className="mx-auto flex size-16 items-center justify-center rounded-[22px] border border-white/80 bg-white/75 text-[#4d8498] shadow-[0_10px_30px_rgba(68,114,133,0.14)]">
            <KeyRound size={30} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-[#6b96a6]">
            First Login
          </p>
          <h2
            id="first-login-password-title"
            className="mt-1 text-2xl font-semibold text-[#304b56]"
          >
            ตั้งรหัสผ่านใหม่
          </h2>
          <p
            id="first-login-password-description"
            className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#66808b]"
          >
            สวัสดี {instructorName} กรุณาเปลี่ยนรหัสผ่านชั่วคราวก่อนเริ่มใช้งาน
          </p>
        </div>

        <form className="space-y-5 px-6 py-6 sm:px-8" onSubmit={handleSubmit}>
          <PasswordField
            id="first-login-new-password"
            label="รหัสผ่านใหม่"
            value={newPassword}
            visible={showNewPassword}
            inputRef={firstInputRef}
            onChange={setNewPassword}
            onToggle={() => setShowNewPassword((visible) => !visible)}
          />
          <PasswordField
            id="first-login-confirm-password"
            label="ยืนยันรหัสผ่านใหม่"
            value={confirmPassword}
            visible={showConfirmPassword}
            onChange={setConfirmPassword}
            onToggle={() => setShowConfirmPassword((visible) => !visible)}
          />

          <div className="flex items-start gap-2.5 rounded-2xl bg-[#eef8fb] px-4 py-3 text-xs leading-5 text-[#5d7c88]">
            <ShieldCheck
              className="mt-0.5 shrink-0 text-[#5592a6]"
              size={17}
              aria-hidden="true"
            />
            <span>
              อย่างน้อย 8 ตัว พร้อมตัวอักษรภาษาอังกฤษและอักขระพิเศษ เช่น ! @ #
            </span>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-2xl bg-[#fff0ee] px-4 py-3 text-sm text-[#b4534e]"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#648fa1] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(75,124,143,0.22)] transition hover:-translate-y-0.5 hover:bg-[#557f91] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <LoaderCircle className="animate-spin" size={18} />
            ) : (
              <ShieldCheck size={18} />
            )}
            {isSaving ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
          </button>

          <p className="text-center text-xs leading-5 text-[#8a9ba2]">
            ต้องตั้งรหัสผ่านใหม่ให้สำเร็จก่อน จึงจะใช้งานเมนูอื่นได้
          </p>
        </form>
      </div>
    </div>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  onToggle: () => void;
}

function PasswordField({
  id,
  label,
  value,
  visible,
  inputRef,
  onChange,
  onToggle,
}: PasswordFieldProps) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm font-medium text-[#415b66]">
        {label}
      </span>
      <span className="flex h-12 items-center rounded-2xl border border-[#c7dfe7] bg-white px-4 shadow-[0_4px_14px_rgba(67,105,119,0.05)] transition focus-within:border-[#7eb0c1] focus-within:ring-4 focus-within:ring-[#c9e8f2]/45">
        <input
          ref={inputRef}
          id={id}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-[#324b55] outline-none placeholder:text-[#a2b0b6]"
          placeholder="กรอกรหัสผ่าน"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="ml-3 rounded-full p-1 text-[#7a98a4] transition hover:bg-[#edf6f9] hover:text-[#4d7e90]"
          aria-label={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}
