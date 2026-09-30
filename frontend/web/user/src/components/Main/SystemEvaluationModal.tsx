"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, MessageSquareHeart } from "lucide-react";
import type { PendingSystemEvaluation, SystemEvaluationAnswers } from "@/interfaces/term.interface";
import termService from "@/services/term.service";

const ratingQuestions = [
  { key: "satisfaction", label: "ความพึงพอใจโดยรวม" },
  { key: "ease_of_use", label: "ความง่ายในการใช้งาน" },
  { key: "usefulness", label: "ประโยชน์ต่อการวางแผนการเรียน" },
] as const;

export default function SystemEvaluationModal({
  evaluation,
  onSubmitted,
  onLater,
}: {
  evaluation: PendingSystemEvaluation;
  onSubmitted: () => void;
  onLater: () => void;
}) {
  const [answers, setAnswers] = useState<SystemEvaluationAnswers>({
    satisfaction: 0,
    ease_of_use: 0,
    usefulness: 0,
    comment: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (ratingQuestions.some(({ key }) => answers[key] === 0)) {
      setError("กรุณาเลือกคะแนนให้ครบทุกข้อ");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await termService.submitSystemEvaluation(evaluation.student_term_id, answers);
      onSubmitted();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "ส่งแบบประเมินไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[22000] flex items-center justify-center bg-[#23343B]/45 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="system-evaluation-title" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-[#D7E8EE] bg-[#FFFEFA] p-6 shadow-2xl sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E5F4FA] text-[#6198AE]">
          <MessageSquareHeart aria-hidden="true" className="h-6 w-6" />
        </div>
        <h2 id="system-evaluation-title" className="mt-3 text-center text-xl font-semibold text-[#405B69]">ช่วยประเมิน Planentrix</h2>
        <p className="mt-1 text-center text-sm text-[#81939A]">
          ขอบคุณที่ใช้งานในภาคเรียน {evaluation.semester_no} ปีการศึกษา {evaluation.academic_year}
        </p>

        <div className="mt-6 space-y-5">
          {ratingQuestions.map(({ key, label }) => (
            <fieldset key={key}>
              <legend className="text-sm font-medium text-[#526B77]">{label}</legend>
              <div className="mt-2 flex items-center justify-between gap-1">
                {Array.from({ length: 5 }, (_, index) => index + 1).map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    aria-pressed={answers[key] === rating}
                    aria-label={`${rating} จาก 5`}
                    onClick={() => setAnswers((current) => ({ ...current, [key]: rating }))}
                    className={`h-10 flex-1 rounded-full border text-sm transition ${answers[key] === rating ? "border-[#77AEC3] bg-[#B9DFF0] font-semibold text-[#35596A]" : "border-[#DCE6E9] bg-white text-[#738891] hover:bg-[#F0F8FB]"}`}
                  >{rating}</button>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-[#9AA8AD]"><span>น้อย</span><span>มาก</span></div>
            </fieldset>
          ))}

          <label className="block text-sm font-medium text-[#526B77]">
            ข้อเสนอแนะเพิ่มเติม <span className="font-normal text-[#9AA8AD]">(ไม่บังคับ)</span>
            <textarea
              value={answers.comment}
              maxLength={2000}
              onChange={(event) => setAnswers((current) => ({ ...current, comment: event.target.value }))}
              rows={3}
              placeholder="อยากให้ปรับปรุงหรือเพิ่มอะไร บอกเราได้เลย"
              className="mt-2 w-full resize-y rounded-2xl border border-[#DCE6E9] bg-white p-3 text-sm font-normal text-[#405B69] outline-none focus:border-[#86B6C8]"
            />
          </label>
        </div>

        {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-center text-xs text-rose-600">{error}</p>}
        <div className="mt-5 flex justify-center gap-3">
          <button type="button" onClick={onLater} disabled={isSubmitting} className="rounded-full border border-[#C7D3D8] px-5 py-2.5 text-sm text-[#6D818A] hover:bg-[#F4F8F9] disabled:opacity-50">ทำภายหลัง</button>
          <button type="button" onClick={() => void submit()} disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-full bg-[#A8D780] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#93C66D] disabled:opacity-60">
            {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "กำลังส่ง..." : "ส่งแบบประเมิน"}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
