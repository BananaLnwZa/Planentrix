"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle, Save, X } from "lucide-react";
import {
  ExamChoice,
  ExamChoicePayload,
  ExamPart,
  ExamPartPayload,
  ExamQuestion,
  ExamQuestionPayload,
} from "@/interfaces/exam-management.interface";

export type ContentFormKind = "part" | "question" | "choice";
export type ContentFormPayload = ExamPartPayload | ExamQuestionPayload | ExamChoicePayload;

interface ExamContentFormModalProps {
  kind: ContentFormKind;
  item?: ExamPart | ExamQuestion | ExamChoice;
  defaultOrder: number;
  onClose: () => void;
  onSave: (payload: ContentFormPayload) => Promise<void>;
}

export default function ExamContentFormModal({ kind, item, defaultOrder, onClose, onSave }: ExamContentFormModalProps) {
  const part = item && "exam_part_name" in item ? item : null;
  const question = item && "question_text" in item ? item : null;
  const choice = item && "choice_text" in item ? item : null;
  const [order, setOrder] = useState(String(part?.part_order ?? question?.question_order ?? choice?.choice_order ?? defaultOrder));
  const [text, setText] = useState(part?.exam_part_name ?? question?.question_text ?? choice?.choice_text ?? "");
  const [score, setScore] = useState(question ? Number(question.question_score).toFixed(2) : "1.00");
  const [isCorrect, setIsCorrect] = useState(choice?.is_correct ?? false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const labels = { part: "Part", question: "คำถาม", choice: "ตัวเลือก" };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const orderNumber = Number(order);
    if (!Number.isInteger(orderNumber) || orderNumber < 1) return setError("ลำดับต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป");
    if (!text.trim()) return setError(`กรุณากรอก${labels[kind]}`);
    let payload: ContentFormPayload;
    if (kind === "part") {
      payload = { part_order: orderNumber, exam_part_name: text.trim() };
    } else if (kind === "question") {
      const scoreNumber = Number(score);
      if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(score) || scoreNumber <= 0 || scoreNumber > 999.99) return setError("คะแนนต้องมากกว่า 0 และมีทศนิยมไม่เกิน 2 ตำแหน่ง");
      payload = { question_order: orderNumber, question_text: text.trim(), question_score: scoreNumber };
    } else {
      payload = { choice_order: orderNumber, choice_text: text.trim(), is_correct: isCorrect };
    }
    setSaving(true); setError("");
    try { await onSave(payload); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "ไม่สามารถบันทึกได้"); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#243b45]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl rounded-[24px] bg-white p-6 shadow-[0_28px_80px_rgba(28,54,65,0.28)]">
        <div className="flex items-center justify-between"><h2 className="text-xl font-semibold text-[#334b55]">{item ? "แก้ไข" : "เพิ่ม"}{labels[kind]}</h2><button type="button" onClick={onClose} disabled={saving} aria-label="ปิด" className="rounded-full p-2 text-[#7d9098] hover:bg-[#edf4f6]"><X size={19} /></button></div>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-[#4c626c]">ลำดับ<input type="number" min="1" step="1" value={order} onChange={(event) => setOrder(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#dbe6ea] px-3.5 font-normal outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]" /></label>
          <label className="block text-sm font-medium text-[#4c626c]">{kind === "part" ? "ชื่อ Part" : kind === "question" ? "ข้อความคำถาม" : "ข้อความตัวเลือก"}{kind === "part" ? <input autoFocus value={text} onChange={(event) => setText(event.target.value)} maxLength={200} className="mt-2 h-11 w-full rounded-xl border border-[#dbe6ea] px-3.5 font-normal outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]" /> : <textarea autoFocus value={text} onChange={(event) => setText(event.target.value)} rows={4} className="mt-2 w-full resize-y rounded-xl border border-[#dbe6ea] px-3.5 py-3 font-normal outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]" />}</label>
          {kind === "question" && <label className="block text-sm font-medium text-[#4c626c]">คะแนน<input type="number" min="0.01" max="999.99" step="0.01" value={score} onChange={(event) => setScore(event.target.value)} onBlur={() => { const value = Number(score); if (value > 0 && value <= 999.99) setScore(value.toFixed(2)); }} className="mt-2 h-11 w-full rounded-xl border border-[#dbe6ea] px-3.5 font-normal outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]" /></label>}
          {kind === "choice" && <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#dbe6ea] bg-[#f8fbfc] p-3.5 text-sm text-[#4c626c]"><input type="checkbox" checked={isCorrect} onChange={(event) => setIsCorrect(event.target.checked)} className="size-4 accent-[#4c93ac]" />เป็นคำตอบที่ถูกต้อง</label>}
          {error && <p role="alert" className="rounded-xl bg-[#fff0ec] px-3.5 py-3 text-sm text-[#a9503c]">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-[#edf1f3] pt-5"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm text-[#687b84] hover:bg-[#eef4f6]">ยกเลิก</button><button type="submit" disabled={saving} className="inline-flex min-w-28 items-center justify-center gap-2 rounded-xl bg-[#4c93ac] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">{saving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}บันทึก</button></div>
        </form>
      </div>
    </div>
  );
}
