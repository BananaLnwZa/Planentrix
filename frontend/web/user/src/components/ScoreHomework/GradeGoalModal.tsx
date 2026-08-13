"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, LockKeyhole, X } from "lucide-react";
import type {
  GradeLetter,
  SaveGradeGoalItem,
  SubjectGradeGoal,
} from "@/interfaces/grade.interface";
import ConfirmGradeGoalsModal from "./ConfirmGradeGoalsModal";
import { GPA_BY_GRADE, GRADE_OPTIONS } from "./gradeOptions";

type GradeSelection = Record<number, GradeLetter | "">;

export default function GradeGoalModal({
  subjects,
  isSaving,
  saveError,
  onClose,
  onSave,
}: {
  subjects: SubjectGradeGoal[];
  isSaving: boolean;
  saveError: string | null;
  onClose: () => void;
  onSave: (goals: SaveGradeGoalItem[]) => void;
}) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selections, setSelections] = useState<GradeSelection>(() =>
    Object.fromEntries(
      subjects.map((subject) => [subject.schedule_time_id, subject.target_grade ?? ""])
    )
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) {
        if (showConfirmation) setShowConfirmation(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose, showConfirmation]);

  const selectedSubjects = subjects.filter(
    (subject) => selections[subject.schedule_time_id]
  );
  const isComplete = selectedSubjects.length === subjects.length;
  const targetGpa = useMemo(() => {
    const selectedCredits = selectedSubjects.reduce(
      (sum, subject) => sum + subject.credits,
      0
    );
    if (!selectedCredits) return 0;
    const points = selectedSubjects.reduce((sum, subject) => {
      const grade = selections[subject.schedule_time_id] as GradeLetter;
      return sum + GPA_BY_GRADE[grade] * subject.credits;
    }, 0);
    return points / selectedCredits;
  }, [selectedSubjects, selections]);

  const goals = subjects.map((subject) => ({
    schedule_time_id: subject.schedule_time_id,
    grade: selections[subject.schedule_time_id] as GradeLetter,
  }));

  return (
    <div className="absolute inset-0 z-[110] flex items-center justify-center rounded-[22px] bg-transparent p-2 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="grade-goal-title"
        className="flex max-h-full w-full max-w-[430px] flex-col overflow-hidden rounded-[22px] border border-[#D4EAF7] bg-[#F8FCFF] shadow-[0_18px_45px_rgba(24,72,99,0.28)]"
      >
        <header className="flex items-start justify-between border-b border-[#DAECF6] bg-white px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E2F4FF] text-[#55AAD9]">
              <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="grade-goal-title" className="text-lg font-semibold text-[#244B63]">
                เลือกเกรดที่ต้องการ
              </h2>
              <p className="mt-0.5 text-[11px] font-medium text-[#567486]">
                เกณฑ์มาตรฐาน A 80 คะแนนขึ้นไป · F ต่ำกว่า 50 คะแนน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="ปิดหน้าต่าง"
            className="rounded-full p-2 text-[#7A98A9] transition hover:bg-[#EDF7FC] hover:text-[#477D9A]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto px-4 py-3">
          <div className="space-y-2">
            {subjects.map((subject, index) => {
              const isPreviouslySaved = subject.target_score !== null;
              return (
                <label
                  key={subject.schedule_time_id}
                  className="grid grid-cols-[minmax(0,1fr)_104px] items-center gap-2.5 rounded-xl border border-[#DCECF5] bg-white px-3 py-2.5 shadow-[0_3px_9px_rgba(80,139,172,0.05)]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[#31566C]">
                      {index + 1}. {subject.subject_name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs font-medium text-[#607887]">
                      {subject.subject_id} · {subject.credits} หน่วยกิต
                      {isPreviouslySaved && (
                        <LockKeyhole className="h-3.5 w-3.5 text-[#6CB6DF]" aria-label="บันทึกแล้ว" />
                      )}
                    </span>
                  </span>
                  <select
                    aria-label={`เกรดเป้าหมายวิชา ${subject.subject_name}`}
                    value={selections[subject.schedule_time_id]}
                    disabled={isPreviouslySaved}
                    onChange={(event) =>
                      setSelections((current) => ({
                        ...current,
                        [subject.schedule_time_id]: event.target.value as GradeLetter,
                      }))
                    }
                    className="min-h-9 w-full rounded-lg border border-[#9FC5D9] bg-[#F8FCFF] px-2.5 text-xs font-semibold text-[#2F657F] opacity-100 outline-none transition focus:border-[#4A9ECB] focus:ring-2 focus:ring-[#D9F0FC] disabled:cursor-not-allowed disabled:bg-[#EDF5F9] disabled:text-[#536D7A]"
                  >
                    <option value="">เลือกเกรด</option>
                    {GRADE_OPTIONS.map((option) => (
                      <option key={option.grade} value={option.grade}>
                        {option.grade} · {option.scoreRange}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        </div>

        <footer className="border-t border-[#D8EBF5] bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[#EAF7FE] px-3 py-2.5">
            <div>
              <p className="text-xs text-[#668B9F]">GPA เป้าหมายของเทอม</p>
              <p className="mt-0.5 text-xs font-medium text-[#5F7887]">
                {isComplete
                  ? `ครบ ${subjects.length} วิชา · คำนวณแบบถ่วงหน่วยกิต`
                  : `เหลืออีก ${subjects.length - selectedSubjects.length} วิชา`}
              </p>
            </div>
            <p className="shrink-0 text-2xl font-semibold text-[#4CA9DD]">
              {selectedSubjects.length ? targetGpa.toFixed(2) : "—"}
              <span className="text-sm font-medium text-[#5D7A8B]"> / 4.00</span>
            </p>
          </div>
          <button
            type="button"
            disabled={!isComplete}
            onClick={() => setShowConfirmation(true)}
            className="mt-3 min-h-10 w-full rounded-full bg-[#62B6E6] px-6 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(75,164,216,0.2)] transition hover:bg-[#50AADD] disabled:cursor-not-allowed disabled:bg-[#BCD7E7] disabled:shadow-none"
          >
            ตรวจสอบและบันทึก
          </button>
        </footer>
      </div>

      {showConfirmation && (
        <ConfirmGradeGoalsModal
          targetGpa={targetGpa}
          isSaving={isSaving}
          error={saveError}
          onBack={() => setShowConfirmation(false)}
          onConfirm={() => onSave(goals)}
        />
      )}
    </div>
  );
}
