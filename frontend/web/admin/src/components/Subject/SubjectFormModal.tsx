"use client";

import { FormEvent, useEffect, useState } from "react";
import { BookPlus, LoaderCircle, Save, X } from "lucide-react";
import AdminSelect from "@/components/ui/AdminSelect";
import type {
  Subject,
  SubjectPayload,
  SubjectType,
} from "@/interfaces/subject-management.interface";

interface SubjectFormModalProps {
  subject: Subject | null;
  subjectTypes: SubjectType[];
  onClose: () => void;
  onSave: (data: SubjectPayload) => Promise<void>;
}

interface FormState {
  subject_id: string;
  subject_name: string;
  credits: string;
  subject_type_id: string;
}

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[#dbe6ea] bg-[#fbfdfe] px-3.5 font-normal text-[#304852] outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa] disabled:bg-[#eef3f5] disabled:text-[#7f9097]";

const createInitialState = (
  subject: Subject | null,
  subjectTypes: SubjectType[],
): FormState => ({
  subject_id: subject?.subject_id ?? "",
  subject_name: subject?.subject_name ?? "",
  credits: String(subject?.credits ?? 3),
  subject_type_id: String(
    subject?.subject_type_id ?? subjectTypes[0]?.subject_type_id ?? "",
  ),
});

export default function SubjectFormModal({
  subject,
  subjectTypes,
  onClose,
  onSave,
}: SubjectFormModalProps) {
  const [form, setForm] = useState<FormState>(() =>
    createInitialState(subject, subjectTypes),
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(subject);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subjectId = form.subject_id.trim().toUpperCase();
    if (!isEditing && !/^[A-Z0-9_-]{1,20}$/.test(subjectId)) {
      setError("รหัสวิชาต้องมี 1–20 ตัว และใช้ได้เฉพาะภาษาอังกฤษ ตัวเลข _ หรือ -");
      return;
    }
    if (!form.subject_name.trim()) {
      setError("กรุณากรอกชื่อวิชา");
      return;
    }
    const credits = Number(form.credits);
    if (!Number.isInteger(credits) || credits < 1 || credits > 9) {
      setError("หน่วยกิตต้องเป็นจำนวนเต็มระหว่าง 1–9");
      return;
    }
    if (!form.subject_type_id) {
      setError("กรุณาเลือกประเภทวิชา");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave({
        ...(!isEditing ? { subject_id: subjectId } : {}),
        subject_name: form.subject_name.trim(),
        credits,
        subject_type_id: Number(form.subject_type_id),
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "ไม่สามารถบันทึกวิชาได้",
      );
    } finally {
      setSaving(false);
    }
  };

  const canSave = subjectTypes.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#243b45]/45 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-labelledby="subject-form-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <div className="max-h-[94svh] w-full max-w-3xl overflow-y-auto rounded-[26px] border border-white/70 bg-white p-5 shadow-[0_28px_80px_rgba(28,54,65,0.25)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-[#e8f5f9] p-3 text-[#478ca4]"><BookPlus size={22} /></span>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#64a0b5]">Subject catalog</p>
              <h2 id="subject-form-title" className="mt-0.5 text-xl font-semibold text-[#304852]">{isEditing ? "แก้ไขข้อมูลวิชาหลัก" : "เพิ่มวิชาหลัก"}</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="ปิด" className="rounded-full p-2 text-[#7d9098] transition hover:bg-[#edf4f6] disabled:opacity-50"><X size={19} /></button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-[#4c626c]">รหัสวิชา
              <input autoFocus={!isEditing} value={form.subject_id} onChange={(event) => updateField("subject_id", event.target.value.toUpperCase())} disabled={isEditing} maxLength={20} placeholder="เช่น CS101" className={inputClass} />
              {isEditing && <span className="mt-1 block text-[11px] font-normal text-[#96a4aa]">ไม่สามารถเปลี่ยนรหัสวิชาหลังสร้างได้</span>}
            </label>
            <label className="text-sm font-medium text-[#4c626c]">ชื่อวิชา
              <input value={form.subject_name} onChange={(event) => updateField("subject_name", event.target.value)} maxLength={200} placeholder="ชื่อรายวิชา" className={inputClass} />
            </label>
            <div className="text-sm font-medium text-[#4c626c]">
              <span>ประเภทวิชา</span>
              <AdminSelect value={form.subject_type_id} onChange={(value) => updateField("subject_type_id", value)} ariaLabel="เลือกประเภทวิชา" placeholder="เลือกประเภทวิชา" className="mt-1.5" disabled={subjectTypes.length === 0} options={subjectTypes.map((type) => ({ value: String(type.subject_type_id), label: type.subject_type_name }))} />
            </div>
            <label className="text-sm font-medium text-[#4c626c]">หน่วยกิต
              <input type="number" inputMode="numeric" min="1" max="9" step="1" value={form.credits} onChange={(event) => updateField("credits", event.target.value)} className={inputClass} />
            </label>
          </div>

          <p className="mt-5 rounded-xl bg-[#f0f7fa] px-3.5 py-3 text-sm text-[#557583]">คณะ สาขา ชั้นปี และภาคเรียน จะกำหนดในแท็บ “โครงสร้างหลักสูตร” หลังสร้างวิชาหลักแล้ว</p>
          {!canSave && <p className="mt-3 rounded-xl bg-[#fff8e8] px-3.5 py-3 text-sm text-[#946c21]">ต้องมีประเภทวิชาที่เปิดใช้งานก่อนจึงจะเพิ่มวิชาได้</p>}
          {error && <p role="alert" className="mt-5 rounded-xl bg-[#fff0ec] px-3.5 py-3 text-sm text-[#a9503c]">{error}</p>}
          <div className="mt-6 flex justify-end gap-2 border-t border-[#edf1f3] pt-5">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm text-[#687b84] transition hover:bg-[#eef4f6] disabled:opacity-50">ยกเลิก</button>
            <button type="submit" disabled={saving || !canSave} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-[#4c93ac] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#3f8299] disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}{saving ? "กำลังบันทึก" : "บันทึกวิชา"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
