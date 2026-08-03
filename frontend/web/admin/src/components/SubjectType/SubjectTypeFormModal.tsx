"use client";

import { FormEvent, useEffect, useState } from "react";
import { LoaderCircle, Save, Tags, X } from "lucide-react";
import { ManagedSubjectType } from "@/interfaces/subject-type-management.interface";

interface SubjectTypeFormModalProps {
  subjectType: ManagedSubjectType | null;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export default function SubjectTypeFormModal({ subjectType, onClose, onSave }: SubjectTypeFormModalProps) {
  const [name, setName] = useState(subjectType?.subject_type_name ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(subjectType);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = name.trim().replace(/\s+/g, " ");
    if (!normalizedName || normalizedName.length > 100) {
      setError("ชื่อประเภทวิชาต้องมีความยาว 1–100 ตัวอักษร");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave(normalizedName);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "ไม่สามารถบันทึกประเภทวิชาได้");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#243b45]/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="subject-type-form-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <div className="w-full max-w-lg rounded-[26px] border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(28,54,65,0.25)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-[#f0eef9] p-3 text-[#776aad]"><Tags size={22} /></span>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8175ad]">Subject type</p>
              <h2 id="subject-type-form-title" className="mt-0.5 text-xl font-semibold text-[#304852]">{isEditing ? "แก้ไขประเภทวิชา" : "เพิ่มประเภทวิชา"}</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="ปิด" className="rounded-full p-2 text-[#7d9098] transition hover:bg-[#edf4f6] disabled:opacity-50"><X size={19} /></button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6">
          {subjectType && <p className="mb-3 text-xs text-[#89989e]">รหัสประเภทวิชา #{subjectType.subject_type_id}</p>}
          <label className="block text-sm font-medium text-[#4c626c]">ชื่อประเภทวิชา
            <input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="เช่น การเขียนโปรแกรม" className="mt-2 h-11 w-full rounded-xl border border-[#dbe6ea] bg-[#fbfdfe] px-3.5 font-normal text-[#304852] outline-none focus:border-[#897db9] focus:ring-4 focus:ring-[#efecfa]" />
          </label>
          <div className="mt-2 flex justify-between text-[11px] text-[#96a4aa]"><span>ชื่อควรสื่อถึงกลุ่มเนื้อหาของวิชา</span><span>{name.length}/100</span></div>
          {error && <p role="alert" className="mt-4 rounded-xl bg-[#fff0ec] px-3.5 py-3 text-sm text-[#a9503c]">{error}</p>}
          <div className="mt-6 flex justify-end gap-2 border-t border-[#edf1f3] pt-5">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm text-[#687b84] transition hover:bg-[#eef4f6] disabled:opacity-50">ยกเลิก</button>
            <button type="submit" disabled={saving} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-[#7669aa] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#685b9b] disabled:opacity-60">
              {saving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}{saving ? "กำลังบันทึก" : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
