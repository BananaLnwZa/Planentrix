"use client";

import { FormEvent, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  ExamChoicePayload,
  ExamPart,
  ExamPartPayload,
  ExamQuestion,
  ExamQuestionPayload,
} from "@/interfaces/exam-management.interface";

export type ContentFormKind = "part" | "question";
export type ContentFormPayload = ExamPartPayload | ExamQuestionPayload;

interface ExamContentFormModalProps {
  kind: ContentFormKind;
  item?: ExamPart | ExamQuestion;
  defaultOrder: number;
  onClose: () => void;
  onSave: (payload: ContentFormPayload) => Promise<void>;
}

const createInitialChoices = (
  question: ExamQuestion | null,
): ExamChoicePayload[] => {
  if (question?.choices.length) {
    return question.choices.map((choice, index) => ({
      choice_order: index + 1,
      choice_text: choice.choice_text,
      is_correct: choice.is_correct,
    }));
  }

  return Array.from({ length: 4 }, (_, index) => ({
    choice_order: index + 1,
    choice_text: "",
    is_correct: false,
  }));
};

export default function ExamContentFormModal({
  kind,
  item,
  defaultOrder,
  onClose,
  onSave,
}: ExamContentFormModalProps) {
  const part = item && "exam_part_name" in item ? item : null;
  const question = item && "question_text" in item ? item : null;
  const [order, setOrder] = useState(
    String(part?.part_order ?? question?.question_order ?? defaultOrder),
  );
  const [text, setText] = useState(
    part?.exam_part_name ?? question?.question_text ?? "",
  );
  const [score, setScore] = useState(
    question ? Number(question.question_score).toFixed(2) : "1.00",
  );
  const [choices, setChoices] = useState<ExamChoicePayload[]>(() =>
    createInitialChoices(question),
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const label = kind === "part" ? "Part" : "คำถาม";

  const updateChoice = (
    index: number,
    updates: Partial<ExamChoicePayload>,
  ) => {
    setChoices((current) =>
      current.map((choice, choiceIndex) =>
        choiceIndex === index ? { ...choice, ...updates } : choice,
      ),
    );
  };

  const selectCorrectChoice = (selectedIndex: number) => {
    setChoices((current) =>
      current.map((choice, index) => ({
        ...choice,
        is_correct: index === selectedIndex,
      })),
    );
  };

  const addChoice = () => {
    setChoices((current) => [
      ...current,
      {
        choice_order: current.length + 1,
        choice_text: "",
        is_correct: false,
      },
    ]);
  };

  const removeChoice = (removedIndex: number) => {
    setChoices((current) =>
      current
        .filter((_, index) => index !== removedIndex)
        .map((choice, index) => ({ ...choice, choice_order: index + 1 })),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const orderNumber = Number(order);
    if (!Number.isInteger(orderNumber) || orderNumber < 1) {
      setError("ลำดับต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป");
      return;
    }
    if (!text.trim()) {
      setError(`กรุณากรอก${label}`);
      return;
    }

    let payload: ContentFormPayload;
    if (kind === "part") {
      payload = { part_order: orderNumber, exam_part_name: text.trim() };
    } else {
      const scoreNumber = Number(score);
      if (
        !/^\d{1,3}(?:\.\d{1,2})?$/.test(score) ||
        scoreNumber <= 0 ||
        scoreNumber > 999.99
      ) {
        setError("กรุณากรอกคะแนนที่มากกว่า 0 และมีทศนิยมไม่เกิน 2 ตำแหน่ง");
        return;
      }
      if (choices.length < 4) {
        setError("กรุณาเพิ่มตัวเลือกอย่างน้อย 4 ตัวเลือก");
        return;
      }
      if (choices.some((choice) => !choice.choice_text.trim())) {
        setError("กรุณากรอกข้อความตัวเลือกให้ครบทุกตัวเลือก");
        return;
      }
      const correctChoiceCount = choices.filter(
        (choice) => choice.is_correct,
      ).length;
      if (correctChoiceCount === 0) {
        setError("กรุณากำหนดคำตอบที่ถูกต้อง 1 ตัวเลือก");
        return;
      }
      if (correctChoiceCount > 1) {
        setError("คำถามหนึ่งข้อกำหนดคำตอบที่ถูกต้องได้เพียง 1 ตัวเลือก");
        return;
      }

      payload = {
        question_order: orderNumber,
        question_text: text.trim(),
        question_score: scoreNumber,
        choices: choices.map((choice, index) => ({
          choice_order: index + 1,
          choice_text: choice.choice_text.trim(),
          is_correct: choice.is_correct,
        })),
      };
    }

    setSaving(true);
    setError("");
    try {
      await onSave(payload);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "ไม่สามารถบันทึกได้",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#243b45]/55 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="content-form-title"
    >
      <div className="flex max-h-[calc(100svh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_28px_80px_rgba(28,54,65,0.28)] sm:max-h-[calc(100svh-2rem)]">
        <div className="flex shrink-0 items-center justify-between border-b border-[#edf1f3] px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium text-[#5594aa]">
              {kind === "question"
                ? "กรอกและบันทึกทุกอย่างในครั้งเดียว"
                : "ข้อมูล Part"}
            </p>
            <h2
              id="content-form-title"
              className="mt-0.5 text-xl font-semibold text-[#334b55]"
            >
              {item ? "แก้ไข" : "เพิ่ม"}
              {label}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="ปิด"
            className="rounded-full p-2 text-[#7d9098] hover:bg-[#edf4f6] disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6"
        >
          <div
            className={
              kind === "question" ? "grid gap-4 sm:grid-cols-2" : ""
            }
          >
            <label className="block text-sm font-medium text-[#4c626c]">
              ลำดับ <span className="text-[#c76450]">*</span>
              <input
                type="number"
                min="1"
                step="1"
                value={order}
                onChange={(event) => setOrder(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[#dbe6ea] px-3.5 font-normal outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]"
              />
            </label>
            {kind === "question" && (
              <label className="block text-sm font-medium text-[#4c626c]">
                คะแนนข้อนี้ <span className="text-[#c76450]">*</span>
                <input
                  type="number"
                  min="0.01"
                  max="999.99"
                  step="0.01"
                  value={score}
                  onChange={(event) => setScore(event.target.value)}
                  onBlur={() => {
                    const value = Number(score);
                    if (value > 0 && value <= 999.99) {
                      setScore(value.toFixed(2));
                    }
                  }}
                  className="mt-2 h-11 w-full rounded-xl border border-[#dbe6ea] px-3.5 font-normal outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]"
                />
              </label>
            )}
          </div>

          <label className="block text-sm font-medium text-[#4c626c]">
            {kind === "part" ? "ชื่อ Part" : "ข้อความคำถาม"}{" "}
            <span className="text-[#c76450]">*</span>
            {kind === "part" ? (
              <input
                autoFocus
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={200}
                className="mt-2 h-11 w-full rounded-xl border border-[#dbe6ea] px-3.5 font-normal outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]"
              />
            ) : (
              <textarea
                autoFocus
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={4}
                className="mt-2 w-full resize-y rounded-xl border border-[#dbe6ea] px-3.5 py-3 font-normal outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]"
              />
            )}
          </label>

          {kind === "question" && (
            <section aria-labelledby="choices-title">
              <div className="rounded-2xl border border-[#d9ebf1] bg-[#f3fafc] px-4 py-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2
                    className="mt-0.5 shrink-0 text-[#4c93ac]"
                    size={18}
                  />
                  <div>
                    <h3
                      id="choices-title"
                      className="text-sm font-semibold text-[#405b66]"
                    >
                      ตัวเลือกคำตอบ
                    </h3>
                    <p className="mt-0.5 text-xs leading-5 text-[#71868f]">
                      กรอกอย่างน้อย 4 ตัวเลือก และเลือกคำตอบที่ถูกต้องเพียง 1
                      ตัวเลือก
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-2.5">
                {choices.map((choice, index) => (
                  <div
                    key={index}
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border p-3 transition ${
                      choice.is_correct
                        ? "border-[#bfe2d2] bg-[#f0faf5]"
                        : "border-[#dfe8eb] bg-[#fbfdfe]"
                    }`}
                  >
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#55707a]">
                      <input
                        type="radio"
                        name="correct-choice"
                        checked={choice.is_correct}
                        onChange={() => selectCorrectChoice(index)}
                        className="size-4 accent-[#4c93ac]"
                        aria-label={`กำหนดตัวเลือก ${index + 1} เป็นคำตอบที่ถูกต้อง`}
                      />
                      <span className="hidden sm:inline">ถูก</span>
                    </label>
                    <div className="min-w-0">
                      <label
                        htmlFor={`choice-${index}`}
                        className="mb-1 block text-[11px] font-medium text-[#7b8d95]"
                      >
                        ตัวเลือก {index + 1}{" "}
                        <span className="text-[#c76450]">*</span>
                      </label>
                      <input
                        id={`choice-${index}`}
                        value={choice.choice_text}
                        onChange={(event) =>
                          updateChoice(index, {
                            choice_text: event.target.value,
                          })
                        }
                        placeholder={`กรอกข้อความตัวเลือก ${index + 1}`}
                        className="h-10 w-full rounded-xl border border-[#dbe6ea] bg-white px-3 text-sm font-normal text-[#405862] outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeChoice(index)}
                      disabled={choices.length <= 4}
                      aria-label={`ลบตัวเลือก ${index + 1}`}
                      title={
                        choices.length <= 4
                          ? "ต้องมีตัวเลือกอย่างน้อย 4 ตัวเลือก"
                          : "ลบตัวเลือก"
                      }
                      className="rounded-lg p-2 text-[#bd6654] hover:bg-[#fff0ec] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addChoice}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#cfe4eb] bg-white px-3.5 py-2 text-xs font-medium text-[#47849a] hover:bg-[#f3fafc]"
              >
                <Plus size={15} /> เพิ่มตัวเลือก
              </button>
            </section>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-[#f0cfc7] bg-[#fff0ec] px-3.5 py-3 text-sm text-[#a9503c]"
            >
              <AlertCircle className="mt-0.5 shrink-0" size={17} />
              <span>{error}</span>
            </div>
          )}

          <div className="sticky -bottom-5 flex justify-end gap-2 border-t border-[#edf1f3] bg-white py-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl px-4 py-2.5 text-sm text-[#687b84] hover:bg-[#eef4f6] disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-[#4c93ac] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#40859d] disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <Save size={17} />
              )}
              บันทึกทั้งหมด
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
