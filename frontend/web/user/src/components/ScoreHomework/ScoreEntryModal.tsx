"use client";

import { useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import type { GradeWorkload, WorkloadScoreInput } from "@/interfaces/grade.interface";

const numberValue = (value: string) => {
  if (!/^\d*(?:\.\d{0,2})?$/.test(value) || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function ScoreEntryModal({
  workload,
  maximumAllowed,
  isSaving,
  serverError,
  onClose,
  onSave,
}: {
  workload: GradeWorkload;
  maximumAllowed: number;
  isSaving: boolean;
  serverError: string | null;
  onClose: () => void;
  onSave: (input: WorkloadScoreInput) => void;
}) {
  const [actual, setActual] = useState(
    workload.actual_score === null ? "" : String(workload.actual_score)
  );
  const [maximum, setMaximum] = useState(
    workload.max_score === null ? "" : String(workload.max_score)
  );
  const [errors, setErrors] = useState<{ actual?: string; maximum?: string }>({});

  const submit = () => {
    const actualValue = numberValue(actual);
    const maximumValue = numberValue(maximum);
    const nextErrors: { actual?: string; maximum?: string } = {};
    if (actualValue === null || actualValue < 0) {
      nextErrors.actual = "กรุณากรอกคะแนนที่ถูกต้อง";
    }
    if (maximumValue === null || maximumValue <= 0) {
      nextErrors.maximum = "คะแนนเต็มต้องมากกว่า 0";
    } else if (maximumValue > maximumAllowed) {
      nextErrors.maximum = "คะแนนเต็มสะสมของวิชาต้องไม่เกิน 100";
    }
    if (
      actualValue !== null &&
      maximumValue !== null &&
      actualValue > maximumValue
    ) {
      nextErrors.actual = "คะแนนที่ได้ต้องไม่เกินคะแนนเต็ม";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || actualValue === null || maximumValue === null) {
      return;
    }
    onSave({ actual_score: actualValue, max_score: maximumValue });
  };

  return (
    <div className="absolute inset-0 z-[130] flex items-center justify-center rounded-[22px] bg-transparent p-2 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="score-entry-title"
        className="w-full max-w-[350px] rounded-[22px] border border-[#E2D7DC] bg-white p-5 shadow-[0_18px_45px_rgba(86,58,70,0.22)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="score-entry-title" className="text-lg font-semibold text-[#3A4E58]">
              กรอกคะแนน
            </h2>
            <p className="mt-1 line-clamp-2 text-sm font-medium text-[#586F7A]">
              {workload.workload_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="ปิด"
            className="rounded-full p-1.5 text-[#EC6688] hover:bg-[#FFF0F4]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <ScoreInput
            label="คะแนนที่ได้"
            value={actual}
            error={errors.actual}
            onChange={(value) => {
              if (/^\d*(?:\.\d{0,2})?$/.test(value)) setActual(value);
              setErrors((current) => ({ ...current, actual: undefined }));
            }}
          />
          <span className="pt-9 text-[#7E8B91]">/</span>
          <ScoreInput
            label="คะแนนเต็ม"
            value={maximum}
            error={errors.maximum}
            onChange={(value) => {
              if (/^\d*(?:\.\d{0,2})?$/.test(value)) setMaximum(value);
              setErrors((current) => ({ ...current, maximum: undefined }));
            }}
          />
        </div>
        <p className="mt-2 text-center text-[11px] font-medium text-[#627985]">
          คะแนนเต็มที่ใส่ได้สูงสุดสำหรับงานนี้ {maximumAllowed.toFixed(2)} คะแนน
        </p>
        {serverError && (
          <p className="mt-3 rounded-xl bg-[#FFF0F4] px-3 py-2 text-center text-xs text-[#C85E7A]">
            {serverError}
          </p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={isSaving}
          className="mx-auto mt-5 flex min-h-10 min-w-[110px] items-center justify-center gap-2 rounded-full bg-[#9CCFE8] px-6 text-sm font-semibold text-white hover:bg-[#83C1DF] disabled:opacity-65"
        >
          {isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {isSaving ? "กำลังบันทึก" : "บันทึก"}
        </button>
      </div>
    </div>
  );
}

function ScoreInput({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[#536B78]">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-10 w-full rounded-full border bg-white px-3 text-center text-sm font-semibold text-[#374957] opacity-100 outline-none placeholder:text-[#657983] placeholder:opacity-100 ${
          error
            ? "border-[#E7869F] bg-[#FFF8FA]"
            : "border-[#C8C8C8] focus:border-[#F080A7]"
        }`}
      />
      {error && <span className="mt-1 block text-[10px] leading-3 text-[#C85E7A]">{error}</span>}
    </label>
  );
}
