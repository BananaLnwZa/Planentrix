"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Clock3, LoaderCircle, X } from "lucide-react";
import type {
  ExamAnswer,
  ExamAttemptSession,
  ExamDetail,
  ExamSubmissionResult,
} from "@/interfaces/exam.interface";
import AuthenticatedExamImage from "@/components/Test/AuthenticatedExamImage";

const timeText = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const scoreText = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

export default function ExamModal({
  exam,
  isSubmitting,
  submitError,
  onStart,
  onSaveAnswer,
  onClose,
  onSubmit,
}: {
  exam: ExamDetail;
  isSubmitting: boolean;
  submitError: string | null;
  onStart: () => Promise<ExamAttemptSession>;
  onSaveAnswer: (attemptId: number, answer: ExamAnswer) => Promise<void>;
  onClose: () => void;
  onSubmit: (attemptId: number) => Promise<ExamSubmissionResult | null>;
}) {
  const [started, setStarted] = useState(false);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [sessionExam, setSessionExam] = useState<ExamDetail | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [savingQuestionId, setSavingQuestionId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [warning, setWarning] = useState(false);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(
    Math.max(1, exam.summary.timeLimitMinutes) * 60
  );
  const [result, setResult] = useState<ExamSubmissionResult | null>(null);
  const didAutoSubmit = useRef(false);

  const submitAnswers = useCallback(async () => {
    if (attemptId === null) return;
    setShowSubmitConfirmation(false);
    const submission = await onSubmit(attemptId);
    if (submission) setResult(submission);
  }, [attemptId, onSubmit]);

  const beginExam = async () => {
    if (isStarting) return;
    setIsStarting(true);
    setActionError(null);
    try {
      const session = await onStart();
      setAttemptId(session.attemptId);
      setSessionExam(session.exam);
      setRemainingSeconds(session.remainingSeconds);
      setAnswers(
        Object.fromEntries(
          session.answers.map((answer) => [answer.questionId, answer.choiceId])
        )
      );
      setStarted(true);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "เริ่มทำข้อสอบไม่สำเร็จ");
    } finally {
      setIsStarting(false);
    }
  };

  const chooseAnswer = async (questionId: number, choiceId: number) => {
    if (attemptId === null || savingQuestionId !== null) return;
    setSavingQuestionId(questionId);
    setActionError(null);
    try {
      await onSaveAnswer(attemptId, { questionId, choiceId });
      setAnswers((current) => ({ ...current, [questionId]: choiceId }));
      setWarning(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "บันทึกคำตอบไม่สำเร็จ");
    } finally {
      setSavingQuestionId(null);
    }
  };

  useEffect(() => {
    if (!started || result || isSubmitting) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [started, result, isSubmitting]);

  useEffect(() => {
    if (
      started &&
      remainingSeconds === 0 &&
      !result &&
      !isSubmitting &&
      savingQuestionId === null &&
      !didAutoSubmit.current
    ) {
      didAutoSubmit.current = true;
      void submitAnswers();
    }
  }, [isSubmitting, remainingSeconds, result, savingQuestionId, started, submitAnswers]);

  const activeExam = sessionExam ?? exam;
  const question = activeExam.questions[currentIndex];
  const hasAnswer = question && answers[question.questionId] !== undefined;

  const goNext = () => {
    if (!hasAnswer) {
      setWarning(true);
      return;
    }
    setWarning(false);
    setCurrentIndex((current) => current + 1);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]">
      <section className="relative max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-3xl border border-[#DCD6CA] bg-[#FFFEF8] p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="ปิด"
          className="absolute right-4 top-4 rounded-full p-1 text-[#59707B] hover:bg-[#EEF4F6] disabled:opacity-50"
        >
          <X className="h-6 w-6" />
        </button>

        {result ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-[#88BF69]" />
            <h2 className="mt-4 text-lg font-semibold text-[#405B69]">ส่งข้อสอบแล้ว</h2>
            <p className="mt-3 text-3xl text-[#E78CA8]">
              {scoreText(result.actualScore)}/{scoreText(result.maximumScore)}
            </p>
            <p className="mt-2 text-sm text-[#738892]">
              ตอบถูก {result.correctAnswers} จาก {result.totalQuestions} ข้อ
            </p>
            {result.checkpointIntervalWeeks > 0 && (
              <p className="mt-3 text-sm text-[#8A6B27]">
                รอบ Checkpoint ถัดไปอีก {result.checkpointIntervalWeeks} สัปดาห์
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-full bg-[#A8D780] px-6 py-2.5 text-sm text-white"
            >
              ดูคำแนะนำ
            </button>
          </div>
        ) : !started ? (
          <div className="py-4">
            <h2 className="pr-8 text-lg font-semibold text-[#405B69]">{exam.summary.examName}</h2>
            <p className="mt-1 text-sm text-[#738892]">{exam.summary.subjectName}</p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-center text-xs text-[#59707B]">
              <div className="rounded-2xl bg-[#EAF6FB] p-3">อัตโนมัติ<br />จำนวนข้อ</div>
              <div className="rounded-2xl bg-[#FFF0BF] p-3">{exam.summary.timeLimitMinutes}<br />นาที</div>
            </div>
            <p className="mt-5 text-xs leading-5 text-[#778990]">
              เมื่อเริ่มแล้วเวลาจะนับถอยหลัง และต้องเลือกคำตอบก่อนจึงจะไปข้อถัดไปได้
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button type="button" onClick={onClose} className="rounded-full border border-[#BAC6CB] px-5 py-2 text-sm text-[#63747C]">ยกเลิก</button>
              <button
                type="button"
                onClick={() => void beginExam()}
                disabled={isStarting}
                className="inline-flex items-center gap-2 rounded-full bg-[#A8D780] px-6 py-2 text-sm text-white disabled:opacity-50"
              >
                {isStarting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {isStarting ? "กำลังเริ่ม" : "เริ่มทำ"}
              </button>
            </div>
            {actionError && <p className="mt-3 text-center text-xs text-red-500">{actionError}</p>}
          </div>
        ) : (
          <div>
            <header className="pr-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-[#78909B]">{activeExam.summary.examName}</p>
                  <h2 className="mt-1 text-lg font-semibold text-[#405B69]">
                    ข้อ {currentIndex + 1}/{activeExam.questions.length}
                  </h2>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-[#FFF0BF] px-3 py-1.5 text-sm text-[#8A6B27]">
                  <Clock3 className="h-4 w-4" /> {timeText(remainingSeconds)}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E6EEF1]">
                <div className="h-full rounded-full bg-[#8CCBE8]" style={{ width: `${((currentIndex + 1) / activeExam.questions.length) * 100}%` }} />
              </div>
            </header>

            <div className="mt-6 rounded-2xl border border-[#DCE4E7] bg-white p-5">
              <p className="text-xs text-[#92A1A7]">{question.partName}</p>
              <h3 className="mt-2 text-base leading-7 text-[#405B69]">{question.text}</h3>
              <AuthenticatedExamImage
                imageUrl={question.imageUrl}
                alt={`รูปประกอบคำถามข้อ ${currentIndex + 1}`}
                className="mt-4 max-h-64 w-full rounded-xl bg-[#f7fafb] object-contain"
              />
              <div className="mt-5 space-y-2.5">
                {question.choices.map((choice) => {
                  const selected = answers[question.questionId] === choice.choiceId;
                  return (
                    <button
                      key={choice.choiceId}
                      type="button"
                      onClick={() => void chooseAnswer(question.questionId, choice.choiceId)}
                      disabled={savingQuestionId !== null || isSubmitting}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition disabled:cursor-wait disabled:opacity-70 ${selected ? "border-[#74A951] bg-[#BFE59E] text-[#365327] shadow-[0_2px_5px_rgba(83,132,54,0.20)]" : "border-[#BFC8CC] bg-[#F8FBFC] text-[#405B69] hover:border-[#89B9CC] hover:bg-[#DDEFF6]"}`}
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${selected ? "bg-[#6FA64C] text-white" : "bg-[#DCE8ED] text-[#536D78]"}`}>
                        {String.fromCharCode(64 + Math.min(Math.max(choice.order, 1), 26))}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block">{choice.text}</span>
                        <AuthenticatedExamImage
                          imageUrl={choice.imageUrl}
                          alt={`รูปตัวเลือก ${choice.order}`}
                          className="mt-2 max-h-40 w-full rounded-lg bg-white object-contain"
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
              {warning && <p className="mt-3 text-xs text-red-500">กรุณาเลือกคำตอบก่อนกดไปข้อถัดไป</p>}
              {submitError && <p className="mt-3 text-xs text-red-500">{submitError}</p>}
              {actionError && <p className="mt-3 text-xs text-red-500">{actionError}</p>}
            </div>

            <footer className="mt-5 flex justify-between gap-3">
              {remainingSeconds === 0 ? (
                <button
                  type="button"
                  onClick={() => void submitAnswers()}
                  disabled={isSubmitting || savingQuestionId !== null}
                  className="ml-auto inline-flex items-center gap-2 rounded-full bg-[#F29AB4] px-6 py-2 text-sm text-white disabled:opacity-60"
                >
                  {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  ส่งคำตอบที่บันทึกไว้
                </button>
              ) : <>
              <button
                type="button"
                onClick={() => { setCurrentIndex((current) => current - 1); setWarning(false); }}
                disabled={currentIndex === 0 || isSubmitting}
                className="rounded-full border border-[#B8C7CD] px-5 py-2 text-sm text-[#607781] disabled:opacity-40"
              >
                ก่อนหน้า
              </button>
              {currentIndex === activeExam.questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => hasAnswer ? setShowSubmitConfirmation(true) : setWarning(true)}
                  disabled={isSubmitting || savingQuestionId !== null}
                  className="inline-flex items-center gap-2 rounded-full bg-[#F29AB4] px-6 py-2 text-sm text-white disabled:opacity-60"
                >
                  {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />} ส่งข้อสอบ
                </button>
              ) : (
                <button type="button" onClick={goNext} disabled={savingQuestionId !== null} className="rounded-full bg-[#8CCBE8] px-6 py-2 text-sm text-white disabled:opacity-50">ข้อต่อไป</button>
              )}
              </>}
            </footer>

            {showSubmitConfirmation && (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-black/25 p-5 backdrop-blur-[1px]">
                <div className="w-full max-w-sm rounded-3xl border border-[#E1D5C9] bg-[#FFFEF8] p-6 text-center shadow-xl">
                  <h3 className="text-xl font-semibold text-[#405B69]">ส่งข้อสอบ</h3>
                  <p className="mt-3 text-sm leading-6 text-[#738892]">
                    ตรวจคำตอบเรียบร้อยแล้ว ต้องการส่งข้อสอบหรือไม่
                  </p>
                  <div className="mt-6 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowSubmitConfirmation(false)}
                      disabled={isSubmitting}
                      className="rounded-full border border-[#B8C7CD] px-5 py-2 text-sm text-[#607781] disabled:opacity-50"
                    >
                      ตรวจอีกครั้ง
                    </button>
                    <button
                      type="button"
                      onClick={() => void submitAnswers()}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-full bg-[#F29AB4] px-6 py-2 text-sm text-white disabled:opacity-60"
                    >
                      {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                      ยืนยันส่ง
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>,
    document.body
  );
}
