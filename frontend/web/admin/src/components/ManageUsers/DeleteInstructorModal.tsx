"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";
import type { ManagedInstructor } from "@/interfaces/user-management.interface";

interface DeleteInstructorModalProps {
  instructor: ManagedInstructor;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteInstructorModal({ instructor, onClose, onConfirm }: DeleteInstructorModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleting, onClose]);

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      await onConfirm();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "ไม่สามารถลบบัญชีได้");
      setDeleting(false);
    }
  };

  const displayName = [instructor.first_name, instructor.last_name].filter(Boolean).join(" ") || instructor.admin_name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#243b45]/45 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="delete-instructor-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) onClose(); }}>
      <div className="w-full max-w-md rounded-[26px] border border-white/70 bg-white p-6 text-center shadow-[0_28px_80px_rgba(28,54,65,0.25)] sm:p-7">
        <button type="button" onClick={onClose} disabled={deleting} aria-label="ปิด" className="ml-auto block rounded-full p-2 text-[#7d9098] transition hover:bg-[#edf4f6] disabled:opacity-50"><X size={19} /></button>
        <span className="mx-auto mt-1 flex size-16 items-center justify-center rounded-full bg-[#fff0e9] text-[#d46f52]"><AlertTriangle size={30} aria-hidden="true" /></span>
        <h2 id="delete-instructor-title" className="mt-5 text-xl font-semibold text-[#334a54]">ยืนยันการลบบัญชีอาจารย์?</h2>
        <p className="mt-2 text-sm leading-6 text-[#6e7f87]">คุณกำลังจะลบบัญชีของ <strong className="font-semibold text-[#3e5660]">{displayName}</strong></p>
        <p className="mt-3 rounded-xl bg-[#fff8f4] px-3 py-2.5 text-xs text-[#a45e49]">หากบัญชียังเชื่อมกับรายวิชาหรือคลังข้อสอบ ระบบจะไม่อนุญาตให้ลบ</p>
        <p className="mt-3 text-xs font-medium text-[#c15e47]">เมื่อลบแล้วจะไม่สามารถกู้คืนผ่านหน้า admin ได้</p>
        {error && <p role="alert" className="mt-3 rounded-xl bg-[#fff0ec] px-3 py-2.5 text-sm text-[#a9503c]">{error}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} disabled={deleting} className="rounded-xl bg-[#edf3f5] px-4 py-2.5 text-sm font-medium text-[#60747d] transition hover:bg-[#e2ecef] disabled:opacity-50">ยกเลิก</button>
          <button type="button" onClick={handleDelete} disabled={deleting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d66f55] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#c76048] disabled:cursor-not-allowed disabled:opacity-60">
            {deleting ? <LoaderCircle className="animate-spin" size={17} /> : <Trash2 size={17} />}
            {deleting ? "กำลังลบ" : "ลบบัญชี"}
          </button>
        </div>
      </div>
    </div>
  );
}
