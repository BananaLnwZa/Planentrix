"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ImageIcon,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import type {
  InstructorExamQuestion,
  UpdateInstructorQuestionRequest,
} from "@/interfaces/instructor-exam.interface";

interface EditableChoice {
  choice_id?: number;
  choice_text: string;
  choice_image_path: string | null;
  is_correct: boolean;
}

interface InstructorQuestionEditModalProps {
  question: InstructorExamQuestion;
  onClose: () => void;
  onSave: (payload: UpdateInstructorQuestionRequest) => Promise<void>;
}

export default function InstructorQuestionEditModal({
  question,
  onClose,
  onSave,
}: InstructorQuestionEditModalProps) {
  const [questionText, setQuestionText] = useState(question.question_text);
  const [questionScore, setQuestionScore] = useState(
    String(question.question_score),
  );
  const [choices, setChoices] = useState<EditableChoice[]>(() =>
    question.choices.map((choice) => ({
      choice_id: choice.choice_id,
      choice_text: choice.choice_text,
      choice_image_path: choice.choice_image_path,
      is_correct: choice.is_correct,
    })),
  );
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const updateChoice = (index: number, updates: Partial<EditableChoice>) => {
    setChoices((currentChoices) =>
      currentChoices.map((choice, choiceIndex) =>
        choiceIndex === index ? { ...choice, ...updates } : choice,
      ),
    );
    setError("");
  };

  const selectCorrectChoice = (selectedIndex: number) => {
    setChoices((currentChoices) =>
      currentChoices.map((choice, choiceIndex) => ({
        ...choice,
        is_correct: choiceIndex === selectedIndex,
      })),
    );
    setError("");
  };

  const addChoice = () => {
    if (choices.length >= 20) return;
    setChoices((currentChoices) => [
      ...currentChoices,
      {
        choice_text: "",
        choice_image_path: null,
        is_correct: false,
      },
    ]);
  };

  const removeChoice = (removedIndex: number) => {
    if (choices.length <= 2) return;
    setChoices((currentChoices) =>
      currentChoices.filter((_, choiceIndex) => choiceIndex !== removedIndex),
    );
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedQuestionText = questionText.trim();
    const score = Number(questionScore);

    if (!normalizedQuestionText) {
      setError("กรุณากรอกโจทย์คำถาม");
      return;
    }
    if (
      !/^\d{1,3}(?:\.\d{1,2})?$/.test(questionScore.trim()) ||
      !Number.isFinite(score) ||
      score <= 0 ||
      score > 999.99
    ) {
      setError("คะแนนต้องอยู่ระหว่าง 0.01-999.99 และมีทศนิยมไม่เกิน 2 ตำแหน่ง");
      return;
    }
    if (choices.length < 2) {
      setError("ต้องมีตัวเลือกอย่างน้อย 2 ตัวเลือก");
      return;
    }
    if (
      choices.some(
        (choice) => !choice.choice_text.trim() && !choice.choice_image_path,
      )
    ) {
      setError("กรุณากรอกข้อความตัวเลือกให้ครบ");
      return;
    }
    if (choices.filter((choice) => choice.is_correct).length !== 1) {
      setError("กรุณาเลือกคำตอบที่ถูกต้องเพียง 1 ตัวเลือก");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await onSave({
        question_text: normalizedQuestionText,
        question_score: score,
        choices: choices.map((choice) => ({
          ...(choice.choice_id ? { choice_id: choice.choice_id } : {}),
          choice_text: choice.choice_text.trim(),
          is_correct: choice.is_correct,
        })),
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "ไม่สามารถบันทึกการแก้ไขได้",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#243b45]/55 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-instructor-question-title"
    >
      <div className="flex max-h-[calc(100svh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[26px] border border-white/70 bg-white shadow-[0_28px_80px_rgba(28,54,65,0.3)] sm:max-h-[calc(100svh-2rem)]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e5eef1] px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#5594aa]">
              Edit Question
            </p>
            <h2
              id="edit-instructor-question-title"
              className="mt-1 text-xl font-semibold text-[#334b55]"
            >
              แก้ไขข้อสอบ
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="ปิดหน้าต่างแก้ไข"
            className="rounded-full p-2 text-[#7d9098] transition hover:bg-[#edf4f6] disabled:opacity-50"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6"
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
            <label className="block text-sm font-medium text-[#4c626c]">
              โจทย์ <span className="text-[#c76450]">*</span>
              <textarea
                autoFocus
                rows={4}
                value={questionText}
                onChange={(event) => {
                  setQuestionText(event.target.value);
                  setError("");
                }}
                className="mt-2 w-full resize-y rounded-2xl border border-[#dbe6ea] bg-[#fbfdfe] px-3.5 py-3 font-normal leading-6 text-[#405862] outline-none transition focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]"
              />
              {question.question_image_path && (
                <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-normal text-[#6f8e99]">
                  <ImageIcon aria-hidden="true" size={14} />
                  รูปประกอบโจทย์เดิมจะยังคงอยู่
                </span>
              )}
            </label>

            <label className="block text-sm font-medium text-[#4c626c]">
              คะแนน <span className="text-[#c76450]">*</span>
              <input
                type="number"
                min="0.01"
                max="999.99"
                step="0.01"
                value={questionScore}
                onChange={(event) => {
                  setQuestionScore(event.target.value);
                  setError("");
                }}
                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe6ea] bg-[#fbfdfe] px-3.5 font-normal text-[#405862] outline-none transition focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]"
              />
            </label>
          </div>

          <section aria-labelledby="instructor-question-choices-title">
            <div className="rounded-2xl border border-[#d9ebf1] bg-[#f3fafc] px-4 py-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[#4c93ac]"
                  size={18}
                />
                <div>
                  <h3
                    id="instructor-question-choices-title"
                    className="text-sm font-semibold text-[#405b66]"
                  >
                    ตัวเลือกและคำตอบที่ถูก
                  </h3>
                  <p className="mt-0.5 text-xs leading-5 text-[#71868f]">
                    เลือกวงกลมหน้าตัวเลือกที่เป็นคำตอบถูกต้องได้เพียง 1 ข้อ
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-2.5">
              {choices.map((choice, index) => (
                <div
                  key={choice.choice_id ?? `new-${index}`}
                  className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border p-3 transition ${
                    choice.is_correct
                      ? "border-[#bfe2d2] bg-[#f0faf5]"
                      : "border-[#dfe8eb] bg-[#fbfdfe]"
                  }`}
                >
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#55707a]">
                    <input
                      type="radio"
                      name="instructor-correct-choice"
                      checked={choice.is_correct}
                      onChange={() => selectCorrectChoice(index)}
                      className="size-4 accent-[#4c93ac]"
                      aria-label={`กำหนดตัวเลือก ${index + 1} เป็นคำตอบที่ถูกต้อง`}
                    />
                    <span className="hidden sm:inline">ถูก</span>
                  </label>
                  <div className="min-w-0">
                    <label
                      htmlFor={`instructor-choice-${index}`}
                      className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#7b8d95]"
                    >
                      ตัวเลือก {index + 1}
                      {choice.choice_image_path && (
                        <span className="inline-flex items-center gap-1 text-[#5d91a3]">
                          <ImageIcon aria-hidden="true" size={12} /> มีรูปเดิม
                        </span>
                      )}
                    </label>
                    <input
                      id={`instructor-choice-${index}`}
                      value={choice.choice_text}
                      onChange={(event) =>
                        updateChoice(index, { choice_text: event.target.value })
                      }
                      placeholder={
                        choice.choice_image_path
                          ? "เว้นว่างได้หากใช้รูปเป็นตัวเลือก"
                          : `กรอกข้อความตัวเลือก ${index + 1}`
                      }
                      className="h-10 w-full rounded-xl border border-[#dbe6ea] bg-white px-3 text-sm font-normal text-[#405862] outline-none transition focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeChoice(index)}
                    disabled={choices.length <= 2}
                    aria-label={`ลบตัวเลือก ${index + 1}`}
                    className="rounded-lg p-2 text-[#bd6654] transition hover:bg-[#fff0ec] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 aria-hidden="true" size={15} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addChoice}
              disabled={choices.length >= 20}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#cfe4eb] bg-white px-3.5 py-2 text-xs font-medium text-[#47849a] transition hover:bg-[#f3fafc] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus aria-hidden="true" size={15} /> เพิ่มตัวเลือก
            </button>
          </section>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-[#f0cfc7] bg-[#fff0ec] px-3.5 py-3 text-sm text-[#a9503c]"
            >
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 shrink-0"
                size={17}
              />
              <span>{error}</span>
            </div>
          )}

          <div className="sticky -bottom-5 flex justify-end gap-2 border-t border-[#edf1f3] bg-white py-5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl px-4 py-2.5 text-sm text-[#687b84] transition hover:bg-[#eef4f6] disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-[#4c93ac] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#40859d] disabled:opacity-60"
            >
              {isSaving ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="animate-spin"
                  size={17}
                />
              ) : (
                <Save aria-hidden="true" size={17} />
              )}
              {isSaving ? "กำลังบันทึก" : "บันทึกการแก้ไข"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
