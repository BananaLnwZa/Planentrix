"use client";

import { Archive, LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  ManagedInstructor,
  ManagedUser,
} from "@/interfaces/user-management.interface";

interface ArchiveAccountModalProps {
  account: ManagedUser | ManagedInstructor;
  kind: "student" | "instructor";
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export default function ArchiveAccountModal({
  account,
  kind,
  onClose,
  onConfirm,
}: ArchiveAccountModalProps) {
  const [reason, setReason] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState("");
  const username = "user_name" in account ? account.user_name : account.admin_name;
  const displayName =
    [account.first_name, account.last_name].filter(Boolean).join(" ") || username;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !archiving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [archiving, onClose]);

  const handleArchive = async () => {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3) {
      setError("กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร");
      return;
    }

    setArchiving(true);
    setError("");
    try {
      await onConfirm(normalizedReason);
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "ไม่สามารถจัดเก็บบัญชีได้",
      );
      setArchiving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#243b45]/45 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="archive-account-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !archiving) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-[26px] border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(28,54,65,0.25)] sm:p-7">
        <button
          type="button"
          onClick={onClose}
          disabled={archiving}
          aria-label="ปิด"
          className="ml-auto block rounded-full p-2 text-[#7d9098] transition hover:bg-[#edf4f6] disabled:opacity-50"
        >
          <X size={19} />
        </button>

        <div className="text-center">
          <span className="mx-auto mt-1 flex size-16 items-center justify-center rounded-full bg-[#eef1f3] text-[#66777e]">
            <Archive size={30} aria-hidden="true" />
          </span>
          <h2 id="archive-account-title" className="mt-5 text-xl font-semibold text-[#334a54]">
            ยืนยันการจัดเก็บบัญชี{kind === "instructor" ? "อาจารย์" : "นักศึกษา"}?
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#6e7f87]">
            บัญชีของ <strong className="font-semibold text-[#3e5660]">{displayName}</strong> จะไม่สามารถเข้าสู่ระบบได้
          </p>
          <p className="mt-3 rounded-xl bg-[#f5f7f8] px-3 py-2.5 text-xs leading-5 text-[#66777e]">
            ประวัติการเรียน คะแนน ข้อสอบ และข้อมูลที่เกี่ยวข้องจะยังคงอยู่ และผู้ดูแลสามารถเปิดใช้งานบัญชีอีกครั้งได้
          </p>
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-medium text-[#526a74]">
            เหตุผลในการจัดเก็บ <span className="text-[#c45f50]">*</span>
          </span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={255}
            rows={3}
            placeholder="ระบุเหตุผลเพื่อบันทึกประวัติการดำเนินการ"
            className="mt-2 w-full resize-none rounded-2xl border border-[#d6e3e7] bg-white px-4 py-3 text-sm text-[#405862] outline-none transition focus:border-[#79b7cc] focus:ring-4 focus:ring-[#e1f3f8]"
          />
          <span className="mt-1 block text-right text-[11px] text-[#94a1a6]">
            {reason.length}/255
          </span>
        </label>

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-[#fff0ec] px-3 py-2.5 text-sm text-[#a9503c]">
            {error}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={archiving}
            className="rounded-xl bg-[#edf3f5] px-4 py-2.5 text-sm font-medium text-[#60747d] transition hover:bg-[#e2ecef] disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={archiving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#687b83] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#586b73] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {archiving ? <LoaderCircle className="animate-spin" size={17} /> : <Archive size={17} />}
            {archiving ? "กำลังจัดเก็บ" : "จัดเก็บบัญชี"}
          </button>
        </div>
      </div>
    </div>
  );
}
