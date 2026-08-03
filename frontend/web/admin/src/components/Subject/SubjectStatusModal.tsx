"use client";

import { useEffect, useState } from "react";
import { ArchiveX, LoaderCircle, RotateCcw, X } from "lucide-react";
import { Subject } from "@/interfaces/subject-management.interface";

interface SubjectStatusModalProps {
  subject: Subject;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function SubjectStatusModal({ subject, onClose, onConfirm }: SubjectStatusModalProps) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const isDeactivating = subject.is_active;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !updating) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, updating]);

  const handleConfirm = async () => {
    setUpdating(true);
    setError("");
    try {
      await onConfirm();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "ไม่สามารถเปลี่ยนสถานะวิชาได้",
      );
      setUpdating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#243b45]/45 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="subject-status-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !updating) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-[26px] border border-white/70 bg-white p-6 text-center shadow-[0_28px_80px_rgba(28,54,65,0.25)] sm:p-7">
        <button type="button" onClick={onClose} disabled={updating} aria-label="ปิด" className="ml-auto block rounded-full p-2 text-[#7d9098] transition hover:bg-[#edf4f6] disabled:opacity-50">
          <X size={19} />
        </button>
        <span className={`mx-auto mt-1 flex size-16 items-center justify-center rounded-full ${isDeactivating ? "bg-[#fff0e9] text-[#d46f52]" : "bg-[#e9f7f0] text-[#4a8b6d]"}`}>
          {isDeactivating ? <ArchiveX size={30} /> : <RotateCcw size={30} />}
        </span>
        <h2 id="subject-status-title" className="mt-5 text-xl font-semibold text-[#334a54]">
          {isDeactivating ? "ปิดใช้งานวิชานี้?" : "กู้คืนวิชานี้?"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6e7f87]">
          <strong className="font-semibold text-[#3e5660]">{subject.subject_id} · {subject.subject_name}</strong>
        </p>
        <p className={`mt-3 rounded-xl px-3 py-2.5 text-xs ${isDeactivating ? "bg-[#fff8f4] text-[#a45e49]" : "bg-[#effaf4] text-[#43765f]"}`}>
          {isDeactivating
            ? "วิชาจะไม่ถูกนำไปสร้างตารางเรียนใหม่ แต่ตารางเรียน ข้อสอบ และประวัติเดิมจะยังอยู่ครบ"
            : "วิชาจะกลับมาแสดงเป็นตัวเลือกและสามารถนำไปสร้างตารางเรียนใหม่ได้อีกครั้ง"}
        </p>
        {error && <p role="alert" className="mt-3 rounded-xl bg-[#fff0ec] px-3 py-2.5 text-sm text-[#a9503c]">{error}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} disabled={updating} className="rounded-xl bg-[#edf3f5] px-4 py-2.5 text-sm font-medium text-[#60747d] transition hover:bg-[#e2ecef] disabled:opacity-50">ยกเลิก</button>
          <button type="button" onClick={handleConfirm} disabled={updating} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition disabled:opacity-60 ${isDeactivating ? "bg-[#d66f55] hover:bg-[#c76048]" : "bg-[#4f9474] hover:bg-[#428164]"}`}>
            {updating ? <LoaderCircle className="animate-spin" size={17} /> : isDeactivating ? <ArchiveX size={17} /> : <RotateCcw size={17} />}
            {updating ? "กำลังบันทึก" : isDeactivating ? "ปิดใช้งาน" : "กู้คืน"}
          </button>
        </div>
      </div>
    </div>
  );
}
