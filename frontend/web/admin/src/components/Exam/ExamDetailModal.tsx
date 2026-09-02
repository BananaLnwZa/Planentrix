"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Circle, FileQuestion, Layers3, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  ExamDetail,
  ExamPart,
  ExamPartPayload,
  ExamQuestion,
  ExamQuestionPayload,
} from "@/interfaces/exam-management.interface";
import { examManagementService } from "@/services/exam-management.service";
import ConfirmContentDeleteModal from "./ConfirmContentDeleteModal";
import ExamContentFormModal, { ContentFormKind, ContentFormPayload } from "./ExamContentFormModal";

interface FormTarget {
  kind: ContentFormKind;
  parentId: number;
  defaultOrder: number;
  item?: ExamPart | ExamQuestion;
}

interface DeleteTarget {
  kind: ContentFormKind;
  id: number;
  label: string;
}

export default function ExamDetailModal({ examId, onClose, onChanged }: { examId: number; onClose: () => void; onChanged: () => Promise<void> }) {
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const loadDetail = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");
    try { const response = await examManagementService.getExamDetail(examId); setExam(response.exam); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดข้อสอบได้"); }
    finally { if (showLoading) setLoading(false); }
  }, [examId]);

  useEffect(() => {
    let active = true;
    examManagementService.getExamDetail(examId).then((response) => { if (active) setExam(response.exam); }).catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดข้อสอบได้"); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [examId]);

  const refresh = async () => { await loadDetail(false); await onChanged(); };

  const saveContent = async (payload: ContentFormPayload) => {
    if (!formTarget) return;
    if (formTarget.kind === "part") {
      const data = payload as ExamPartPayload;
      if (formTarget.item && "exam_part_id" in formTarget.item) await examManagementService.updatePart(formTarget.item.exam_part_id, data);
      else await examManagementService.createPart(examId, data);
    } else if (formTarget.kind === "question") {
      const data = payload as ExamQuestionPayload;
      if (formTarget.item && "question_id" in formTarget.item) await examManagementService.updateQuestion(formTarget.item.question_id, data);
      else await examManagementService.createQuestion(formTarget.parentId, data);
    }
    setFormTarget(null);
    await refresh();
  };

  const deleteContent = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "part") await examManagementService.deletePart(deleteTarget.id);
    else await examManagementService.deleteQuestion(deleteTarget.id);
    setDeleteTarget(null);
    await refresh();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#243b45]/50 p-2 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[26px] bg-[#f7fafb] shadow-[0_30px_90px_rgba(23,48,58,0.3)]">
        <header className="flex items-start justify-between gap-4 border-b border-[#dce7eb] bg-white px-5 py-4 sm:px-7">
          <div className="min-w-0"><p className="font-mono text-xs text-[#4b91aa]">EXAM #{examId}</p><h2 className="truncate text-xl font-semibold text-[#304852]">{exam?.exam_name ?? "รายละเอียดข้อสอบ"}</h2>{exam && <p className="mt-1 text-xs text-[#7d8e95]">{exam.subject_id} · {exam.subject_name} · {exam.total_question} ข้อ · {Number(exam.total_score).toFixed(2)} คะแนน</p>}</div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-full p-2.5 text-[#74868e] hover:bg-[#edf4f6]"><X size={21} /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? <div className="flex h-64 items-center justify-center gap-3 text-[#6f828b]"><LoaderCircle className="animate-spin" />กำลังโหลดเนื้อหาข้อสอบ...</div> : error ? <div className="flex h-64 flex-col items-center justify-center text-center"><AlertCircle className="text-[#cf6e56]" size={30} /><p className="mt-3 text-[#536a74]">{error}</p><button type="button" onClick={() => void loadDetail()} className="mt-4 rounded-xl bg-[#4c93ac] px-4 py-2 text-sm text-white">ลองอีกครั้ง</button></div> : exam && (
            <>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2"><span className="rounded-full bg-[#e9f5f9] px-3 py-1.5 text-xs text-[#447e93]"><Layers3 className="mr-1 inline" size={14} />{exam.parts.length} Parts</span><span className="rounded-full bg-[#f1effb] px-3 py-1.5 text-xs text-[#7165a0]"><FileQuestion className="mr-1 inline" size={14} />{exam.total_question} คำถาม</span>{exam.attempt_count > 0 && <span className="rounded-full bg-[#fff0ea] px-3 py-1.5 text-xs text-[#a65f49]">มีประวัติการทำ {exam.attempt_count} ครั้ง</span>}</div><button type="button" onClick={() => setFormTarget({ kind: "part", parentId: examId, defaultOrder: Math.max(0, ...exam.parts.map((part) => part.part_order)) + 1 })} className="inline-flex items-center gap-2 rounded-xl bg-[#4c93ac] px-4 py-2.5 text-sm font-medium text-white"><Plus size={17} />เพิ่ม Part</button></div>

              <div className="space-y-4">
                {exam.parts.map((part, partIndex) => (
                  <details key={part.exam_part_id} open={partIndex === 0 ? true : undefined} className="group overflow-hidden rounded-[20px] border border-[#dfe9ec] bg-white shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5"><div className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e9f5f9] text-sm font-semibold text-[#43839a]">{part.part_order}</span><div className="min-w-0"><h3 className="truncate font-semibold text-[#39515c]">{part.exam_part_name}</h3><p className="text-xs text-[#84949b]">{part.total_question} ข้อ · {Number(part.part_score).toFixed(2)} คะแนน</p></div></div><div className="flex items-center gap-1"><button type="button" onClick={(event) => { event.preventDefault(); setFormTarget({ kind: "part", parentId: examId, defaultOrder: part.part_order, item: part }); }} className="rounded-lg p-2 text-[#6f65a2] hover:bg-[#f1effb]"><Pencil size={15} /></button><button type="button" disabled={exam.attempt_count > 0} onClick={(event) => { event.preventDefault(); setDeleteTarget({ kind: "part", id: part.exam_part_id, label: `Part ${part.part_order}: ${part.exam_part_name} พร้อมคำถามและตัวเลือกทั้งหมด` }); }} className="rounded-lg p-2 text-[#c6644d] hover:bg-[#fff0ec] disabled:opacity-35"><Trash2 size={15} /></button><ChevronDown className="ml-1 text-[#82949c] transition group-open:rotate-180" size={18} /></div></summary>
                    <div className="border-t border-[#edf1f3] bg-[#fbfdfe] p-4 sm:p-5">
                      <div className="mb-3 flex justify-end"><button type="button" onClick={() => setFormTarget({ kind: "question", parentId: part.exam_part_id, defaultOrder: Math.max(0, ...part.questions.map((question) => question.question_order)) + 1 })} className="inline-flex items-center gap-1.5 rounded-lg bg-[#edf6f9] px-3 py-2 text-xs font-medium text-[#427d93]"><Plus size={15} />เพิ่มคำถาม</button></div>
                      {part.questions.length === 0 ? <p className="py-8 text-center text-sm text-[#93a0a6]">ยังไม่มีคำถามใน Part นี้</p> : <div className="space-y-3">{part.questions.map((question) => (
                        <article key={question.question_id} className="rounded-2xl border border-[#e2eaed] bg-white p-4">
                          <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f1effb] text-xs font-semibold text-[#7569a6]">{question.question_order}</span><div><p className="whitespace-pre-wrap text-sm leading-6 text-[#415963]">{question.question_text}</p><p className="mt-1 text-xs text-[#8a989e]">{Number(question.question_score).toFixed(2)} คะแนน</p></div></div><div className="flex shrink-0"><button type="button" onClick={() => setFormTarget({ kind: "question", parentId: part.exam_part_id, defaultOrder: question.question_order, item: question })} className="p-2 text-[#6f65a2]"><Pencil size={14} /></button><button type="button" disabled={exam.attempt_count > 0} onClick={() => setDeleteTarget({ kind: "question", id: question.question_id, label: `คำถามข้อ ${question.question_order} พร้อมตัวเลือกทั้งหมด` })} className="p-2 text-[#c6644d] disabled:opacity-35"><Trash2 size={14} /></button></div></div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">{question.choices.map((choice) => <div key={choice.choice_id} className={`flex items-start gap-2 rounded-xl border p-2.5 text-xs ${choice.is_correct ? "border-[#cce8da] bg-[#effaf4] text-[#39745a]" : "border-[#e5eaec] bg-[#f9fbfc] text-[#61737b]"}`}>{choice.is_correct ? <CheckCircle2 className="mt-0.5 shrink-0" size={14} /> : <Circle className="mt-0.5 shrink-0" size={14} />}<span className="min-w-0 flex-1">{choice.choice_order}. {choice.choice_text}</span></div>)}</div>
                        </article>
                      ))}</div>}
                    </div>
                  </details>
                ))}
                {exam.parts.length === 0 && <div className="rounded-[20px] border border-dashed border-[#ccdce1] bg-white py-16 text-center text-sm text-[#8b9ba2]">ยังไม่มี Part — กด “เพิ่ม Part” เพื่อเริ่มสร้างข้อสอบ</div>}
              </div>
            </>
          )}
        </div>
      </div>
      {formTarget && <ExamContentFormModal key={`${formTarget.kind}-${formTarget.item ? "exam_part_name" in formTarget.item ? formTarget.item.exam_part_id : formTarget.item.question_id : "new"}`} kind={formTarget.kind} item={formTarget.item} defaultOrder={formTarget.defaultOrder} onClose={() => setFormTarget(null)} onSave={saveContent} />}
      {deleteTarget && <ConfirmContentDeleteModal label={deleteTarget.label} onClose={() => setDeleteTarget(null)} onConfirm={deleteContent} />}
    </div>
  );
}
