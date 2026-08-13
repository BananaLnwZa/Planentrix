"use client";

import { FormEvent, useEffect, useState } from "react";
import { BookPlus, LoaderCircle, Save, X } from "lucide-react";
import AdminSelect from "@/components/ui/AdminSelect";
import LocalizedDateTimeInput from "@/components/common/LocalizedDateTimeInput";
import { Subject, SubjectPayload, SubjectType } from "@/interfaces/subject-management.interface";

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
  classroom: string;
  teacher_name: string;
  schedule_day: string;
  start_time: string;
  end_time: string;
  term: string;
  academic_year: string;
  subject_type_id: string;
}

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-[#dbe6ea] bg-[#fbfdfe] px-3.5 font-normal text-[#304852] outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa] disabled:bg-[#eef3f5] disabled:text-[#7f9097]";

const createInitialState = (subject: Subject | null, subjectTypes: SubjectType[]): FormState => ({
  subject_id: subject?.subject_id ?? "",
  subject_name: subject?.subject_name ?? "",
  credits: subject ? Number(subject.credits).toFixed(2) : "3.00",
  classroom: subject?.classroom ?? "",
  teacher_name: subject?.teacher_name ?? "",
  schedule_day: String(subject?.schedule_day ?? 1),
  start_time: subject?.start_time.slice(0, 5) ?? "09:00",
  end_time: subject?.end_time.slice(0, 5) ?? "12:00",
  term: String(subject?.term ?? 1),
  academic_year: String(subject?.academic_year ?? 1),
  subject_type_id: String(subject?.subject_type_id ?? subjectTypes[0]?.subject_type_id ?? ""),
});

export default function SubjectFormModal({ subject, subjectTypes, onClose, onSave }: SubjectFormModalProps) {
  const [form, setForm] = useState<FormState>(() => createInitialState(subject, subjectTypes));
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
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subjectId = form.subject_id.trim();

    if (!isEditing && !/^[A-Za-z0-9_-]{1,20}$/.test(subjectId)) {
      setError("รหัสวิชาต้องมี 1–20 ตัว และใช้ได้เฉพาะภาษาอังกฤษ ตัวเลข _ หรือ -");
      return;
    }
    if (!form.subject_name.trim() || !form.teacher_name.trim() || !form.classroom.trim()) {
      setError("กรุณากรอกชื่อวิชา ชื่อผู้สอน และห้องเรียนให้ครบ");
      return;
    }
    if (form.classroom.trim().length > 10) {
      setError("ห้องเรียนต้องไม่เกิน 10 ตัวอักษร");
      return;
    }
    const creditsText = form.credits.trim();
    const credits = Number(creditsText);
    if (
      !/^[0-9](?:\.\d{1,2})?$/.test(creditsText) ||
      !Number.isFinite(credits) ||
      credits <= 0 ||
      credits > 9.99
    ) {
      setError(
        "หน่วยกิตต้องอยู่ระหว่าง 0.01–9.99 และมีทศนิยมไม่เกิน 2 ตำแหน่ง",
      );
      return;
    }
    if (form.start_time >= form.end_time) {
      setError("เวลาเลิกเรียนต้องอยู่หลังเวลาเริ่มเรียน");
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
        classroom: form.classroom.trim(),
        teacher_name: form.teacher_name.trim(),
        schedule_day: Number(form.schedule_day),
        start_time: form.start_time,
        end_time: form.end_time,
        term: Number(form.term),
        academic_year: Number(form.academic_year),
        subject_type_id: Number(form.subject_type_id),
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "ไม่สามารถบันทึกวิชาได้");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#243b45]/45 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-labelledby="subject-form-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <div className="max-h-[94svh] w-full max-w-3xl overflow-y-auto rounded-[26px] border border-white/70 bg-white p-5 shadow-[0_28px_80px_rgba(28,54,65,0.25)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-[#e8f5f9] p-3 text-[#478ca4]"><BookPlus size={22} /></span>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#64a0b5]">Subject catalog</p>
              <h2 id="subject-form-title" className="mt-0.5 text-xl font-semibold text-[#304852]">{isEditing ? "แก้ไขวิชา" : "เพิ่มวิชาใหม่"}</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="ปิด" className="rounded-full p-2 text-[#7d9098] transition hover:bg-[#edf4f6] disabled:opacity-50"><X size={19} /></button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-[#4c626c]">รหัสวิชา
              <input autoFocus={!isEditing} value={form.subject_id} onChange={(event) => updateField("subject_id", event.target.value)} disabled={isEditing} maxLength={20} placeholder="เช่น CS101" className={inputClass} />
              {isEditing && <span className="mt-1 block text-[11px] font-normal text-[#96a4aa]">ไม่สามารถเปลี่ยนรหัสวิชาหลังสร้างได้</span>}
            </label>
            <label className="text-sm font-medium text-[#4c626c]">ชื่อวิชา
              <input value={form.subject_name} onChange={(event) => updateField("subject_name", event.target.value)} maxLength={100} placeholder="ชื่อรายวิชา" className={inputClass} />
            </label>
            <div className="text-sm font-medium text-[#4c626c]">
              <span>ประเภทวิชา</span>
              <AdminSelect
                value={form.subject_type_id}
                onChange={(value) => updateField("subject_type_id", value)}
                ariaLabel="เลือกประเภทวิชา"
                placeholder="เลือกประเภทวิชา"
                className="mt-1.5"
                disabled={subjectTypes.length === 0}
                options={subjectTypes.map((type) => ({
                  value: String(type.subject_type_id),
                  label: type.subject_type_name,
                }))}
              />
            </div>
            <label className="text-sm font-medium text-[#4c626c]">หน่วยกิต
              <input
                type="number"
                inputMode="decimal"
                min="0.01"
                max="9.99"
                step="0.01"
                value={form.credits}
                onChange={(event) => updateField("credits", event.target.value)}
                onBlur={() => {
                  const credits = Number(form.credits);
                  if (
                    Number.isFinite(credits) &&
                    credits > 0 &&
                    credits <= 9.99
                  ) {
                    updateField("credits", credits.toFixed(2));
                  }
                }}
                placeholder="เช่น 3 หรือ 2.75"
                className={inputClass}
              />
              <span className="mt-1 block text-[11px] font-normal text-[#96a4aa]">
                กรอกได้ เช่น 3, 3.01 หรือ 2.75 — ค่า 3 จะจัดรูปแบบเป็น 3.00
              </span>
            </label>
            <label className="text-sm font-medium text-[#4c626c]">ชื่อผู้สอน
              <input value={form.teacher_name} onChange={(event) => updateField("teacher_name", event.target.value)} maxLength={100} placeholder="ชื่ออาจารย์ผู้สอน" className={inputClass} />
            </label>
            <label className="text-sm font-medium text-[#4c626c]">ห้องเรียน
              <input value={form.classroom} onChange={(event) => updateField("classroom", event.target.value)} maxLength={10} placeholder="เช่น SC401" className={inputClass} />
            </label>
            <div className="text-sm font-medium text-[#4c626c]">
              <span>ชั้นปี</span>
              <AdminSelect
                value={form.academic_year}
                onChange={(value) => updateField("academic_year", value)}
                ariaLabel="เลือกชั้นปี"
                className="mt-1.5"
                tone="violet"
                options={Array.from({ length: 4 }, (_, index) => ({
                  value: String(index + 1),
                  label: `ชั้นปีที่ ${index + 1}`,
                }))}
              />
            </div>
            <div className="text-sm font-medium text-[#4c626c]">
              <span>ภาคการศึกษา</span>
              <AdminSelect
                value={form.term}
                onChange={(value) => updateField("term", value)}
                ariaLabel="เลือกภาคการศึกษา"
                className="mt-1.5"
                tone="violet"
                options={[
                  { value: "1", label: "เทอม 1" },
                  { value: "2", label: "เทอม 2" },
                ]}
              />
            </div>
            <div className="text-sm font-medium text-[#4c626c]">
              <span>วันเรียน</span>
              <AdminSelect
                value={form.schedule_day}
                onChange={(value) => updateField("schedule_day", value)}
                ariaLabel="เลือกวันเรียน"
                className="mt-1.5"
                options={[
                  ["1", "วันจันทร์"],
                  ["2", "วันอังคาร"],
                  ["3", "วันพุธ"],
                  ["4", "วันพฤหัสบดี"],
                  ["5", "วันศุกร์"],
                  ["6", "วันเสาร์"],
                  ["7", "วันอาทิตย์"],
                ].map(([value, label]) => ({ value, label }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium text-[#4c626c]">เวลาเริ่ม
                <LocalizedDateTimeInput type="time" step={60} value={form.start_time} onChange={(event) => updateField("start_time", event.target.value)} className={inputClass} />
              </label>
              <label className="text-sm font-medium text-[#4c626c]">เวลาสิ้นสุด
                <LocalizedDateTimeInput type="time" step={60} value={form.end_time} onChange={(event) => updateField("end_time", event.target.value)} className={inputClass} />
              </label>
            </div>
          </div>

          {error && <p role="alert" className="mt-5 rounded-xl bg-[#fff0ec] px-3.5 py-3 text-sm text-[#a9503c]">{error}</p>}
          <div className="mt-6 flex justify-end gap-2 border-t border-[#edf1f3] pt-5">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm text-[#687b84] transition hover:bg-[#eef4f6] disabled:opacity-50">ยกเลิก</button>
            <button type="submit" disabled={saving || subjectTypes.length === 0} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-[#4c93ac] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#3f8299] disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}{saving ? "กำลังบันทึก" : "บันทึกวิชา"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
