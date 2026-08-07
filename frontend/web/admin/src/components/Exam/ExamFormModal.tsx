"use client";

import { FormEvent, useEffect, useState } from "react";
import { ClipboardPlus, LoaderCircle, Save, X } from "lucide-react";
import AdminSelect from "@/components/ui/AdminSelect";
import { ExamPayload, ExamSubjectOption, ExamSummary } from "@/interfaces/exam-management.interface";

interface ExamFormModalProps {
  exam: ExamSummary | null;
  subjects: ExamSubjectOption[];
  onClose: () => void;
  onSave: (payload: ExamPayload) => Promise<void>;
}

export default function ExamFormModal({ exam, subjects, onClose, onSave }: ExamFormModalProps) {
  const [subjectId, setSubjectId] = useState(exam?.subject_id ?? subjects[0]?.subject_id ?? "");
  const [examName, setExamName] = useState(exam?.exam_name ?? "");
  const [timeLimit, setTimeLimit] = useState(String(exam?.time_limit ?? 60));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => event.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [onClose, saving]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const minutes = Number(timeLimit);
    if (!subjectId) return setError("กรุณาเลือกวิชา");
    if (!examName.trim() || examName.trim().length > 200) return setError("ชื่อชุดข้อสอบต้องมีความยาว 1–200 ตัวอักษร");
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) return setError("เวลาทำข้อสอบต้องอยู่ระหว่าง 1–1440 นาที");
    setSaving(true);
    setError("");
    try {
      await onSave({ subject_id: subjectId, exam_name: examName.trim(), time_limit: minutes });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "ไม่สามารถบันทึกชุดข้อสอบได้");
    } finally {
      setSaving(false);
    }
  };

  const options = exam && !subjects.some((subject) => subject.subject_id === exam.subject_id)
    ? [{ subject_id: exam.subject_id, subject_name: `${exam.subject_name} (ปิดใช้งาน)`, academic_year: exam.academic_year, term: exam.term }, ...subjects]
    : subjects;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#243b45]/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <div className="w-full max-w-xl rounded-[26px] border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(28,54,65,0.25)] sm:p-7">
        <div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="rounded-2xl bg-[#e8f5f9] p-3 text-[#478ca4]"><ClipboardPlus size={22} /></span><div><p className="text-xs uppercase tracking-[0.15em] text-[#64a0b5]">Exam set</p><h2 className="text-xl font-semibold text-[#304852]">{exam ? "แก้ไขชุดข้อสอบ" : "เพิ่มชุดข้อสอบ"}</h2></div></div><button type="button" onClick={onClose} disabled={saving} aria-label="ปิด" className="rounded-full p-2 text-[#7d9098] hover:bg-[#edf4f6]"><X size={19} /></button></div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="text-sm font-medium text-[#4c626c]">
            <span>วิชา</span>
            <AdminSelect
              value={subjectId}
              onChange={setSubjectId}
              ariaLabel="เลือกวิชาสำหรับชุดข้อสอบ"
              placeholder="เลือกวิชา"
              className="mt-2"
              tone="violet"
              disabled={options.length === 0}
              options={options.map((subject) => ({
                value: subject.subject_id,
                label: `${subject.subject_id} · ${subject.subject_name}`,
                description: `ชั้นปี ${subject.academic_year} · เทอม ${subject.term}`,
              }))}
            />
          </div>
          <label className="block text-sm font-medium text-[#4c626c]">ชื่อชุดข้อสอบ<input autoFocus value={examName} onChange={(event) => setExamName(event.target.value)} maxLength={200} placeholder="เช่น ข้อสอบกลางภาค" className="mt-2 h-11 w-full rounded-xl border border-[#dbe6ea] bg-[#fbfdfe] px-3.5 font-normal outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]" /></label>
          <label className="block text-sm font-medium text-[#4c626c]">เวลาทำข้อสอบ (นาที)<input type="number" min="1" max="1440" step="1" value={timeLimit} onChange={(event) => setTimeLimit(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#dbe6ea] bg-[#fbfdfe] px-3.5 font-normal outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]" /></label>
          {error && <p role="alert" className="rounded-xl bg-[#fff0ec] px-3.5 py-3 text-sm text-[#a9503c]">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-[#edf1f3] pt-5"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm text-[#687b84] hover:bg-[#eef4f6]">ยกเลิก</button><button type="submit" disabled={saving || options.length === 0} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-[#4c93ac] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">{saving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}{saving ? "กำลังบันทึก" : "บันทึก"}</button></div>
        </form>
      </div>
    </div>
  );
}
