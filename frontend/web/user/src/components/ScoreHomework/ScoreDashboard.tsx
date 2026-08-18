"use client";

import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import type {
  GradeWorkload,
  OverallGradeSummary,
  SubjectGradeGoal,
  WorkloadScoreInput,
} from "@/interfaces/grade.interface";
import gradeService from "@/services/grade.service";
import GpaGauge from "./GpaGauge";
import ScoreEntryModal from "./ScoreEntryModal";
import { getWorkloadPalette } from "./homeworkUtils";

const getScoreSummary = (workloads: GradeWorkload[]) => {
  const scored = workloads.filter(
    (workload) => workload.actual_score !== null && workload.max_score !== null
  );
  const actual = Math.min(
    100,
    Math.max(
      0,
      scored.reduce((sum, workload) => sum + Number(workload.actual_score), 0)
    )
  );
  const maximum = scored.reduce((sum, workload) => sum + Number(workload.max_score), 0);
  return { actual, maximum, percent: actual };
};

const formatScore = (value: number) =>
  Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");

const gradeFromPercent = (percent: number, hasScore: boolean) => {
  if (!hasScore) return "—";
  if (percent >= 80) return "A";
  if (percent >= 75) return "B+";
  if (percent >= 70) return "B";
  if (percent >= 65) return "C+";
  if (percent >= 60) return "C";
  if (percent >= 55) return "D+";
  if (percent >= 50) return "D";
  return "F";
};

const gpaFromPercent = (percent: number) => {
  if (percent >= 80) return 4;
  if (percent >= 75) return 3.5;
  if (percent >= 70) return 3;
  if (percent >= 65) return 2.5;
  if (percent >= 60) return 2;
  if (percent >= 55) return 1.5;
  if (percent >= 50) return 1;
  return 0;
};

const minimumScoreFromTargetGpa = (targetGpa: number | null) => {
  if (targetGpa === null) return null;
  if (targetGpa >= 4) return 80;
  if (targetGpa >= 3.5) return 75;
  if (targetGpa >= 3) return 70;
  if (targetGpa >= 2.5) return 65;
  if (targetGpa >= 2) return 60;
  if (targetGpa >= 1.5) return 55;
  if (targetGpa >= 1) return 50;
  return 0;
};

const getGoalProgressPercent = (actualScore: number, targetGpa: number | null) => {
  const targetScore = minimumScoreFromTargetGpa(targetGpa);
  if (targetScore === null) return actualScore;
  if (targetScore === 0) return 100;
  return Math.min(100, Math.max(0, (actualScore / targetScore) * 100));
};

const isCompleted = (status: GradeWorkload["workload_status"]) => {
  if (status === true || status === 1) return true;
  return ["1", "completed", "complete", "done"].includes(
    String(status).toLowerCase().trim()
  );
};

export default function ScoreDashboard({
  subjects,
  overall,
  onSubjectsChange,
  onScoreSaved,
}: {
  subjects: SubjectGradeGoal[];
  overall: OverallGradeSummary | null;
  onSubjectsChange: (subjects: SubjectGradeGoal[]) => void;
  onScoreSaved: () => void;
}) {
  const [selectedId, setSelectedId] = useState(subjects[0]?.schedule_time_id);
  const [editingWorkload, setEditingWorkload] = useState<GradeWorkload | null>(null);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const selected =
    subjects.find((subject) => subject.schedule_time_id === selectedId) ?? subjects[0];

  const targetGpa = useMemo(() => {
    const totalCredits = subjects.reduce((sum, subject) => sum + subject.credits, 0);
    const points = subjects.reduce(
      (sum, subject) => sum + Number(subject.target_score ?? 0) * subject.credits,
      0
    );
    return totalCredits ? points / totalCredits : 0;
  }, [subjects]);

  const currentGpa = useMemo(() => {
    const totalCredits = subjects.reduce((sum, subject) => sum + subject.credits, 0);
    if (!totalCredits) return 0;

    const currentPoints = subjects.reduce((sum, subject) => {
      const subjectScore = getScoreSummary(
        subject.workloads.filter((workload) => isCompleted(workload.workload_status))
      );
      const subjectGpa = subjectScore.maximum
        ? gpaFromPercent(subjectScore.percent)
        : 0;
      return sum + subjectGpa * subject.credits;
    }, 0);

    return currentPoints / totalCredits;
  }, [subjects]);

  if (!selected) return null;
  const orderedSubjects = [
    selected,
    ...subjects.filter(
      (subject) => subject.schedule_time_id !== selected.schedule_time_id
    ),
  ];
  const completedWorkloads = selected.workloads.filter((workload) =>
    isCompleted(workload.workload_status)
  );
  const summary = getScoreSummary(completedWorkloads);
  const progressPercent = getGoalProgressPercent(summary.actual, selected.target_score);
  const currentGrade = gradeFromPercent(summary.percent, summary.maximum > 0);

  const openScoreEntry = (workload: GradeWorkload) => {
    setScoreError(null);
    setEditingWorkload(workload);
  };

  const saveScore = async (input: WorkloadScoreInput) => {
    if (!editingWorkload) return;
    setIsSavingScore(true);
    setScoreError(null);
    try {
      await gradeService.saveWorkloadScore(editingWorkload.workload_id, input);
      onSubjectsChange(
        subjects.map((subject) => ({
          ...subject,
          workloads: subject.workloads.map((workload) =>
            workload.workload_id === editingWorkload.workload_id
              ? {
                  ...workload,
                  actual_score: input.actual_score,
                  max_score: input.max_score,
                }
              : workload
          ),
        }))
      );
      onScoreSaved();
      setEditingWorkload(null);
    } catch (error) {
      setScoreError(error instanceof Error ? error.message : "บันทึกคะแนนไม่สำเร็จ");
    } finally {
      setIsSavingScore(false);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <GpaGauge
        currentGpa={overall?.overall_actual_gpa ?? currentGpa}
        targetGpa={overall?.overall_target_gpa ?? targetGpa}
      />

      <section>
        <div className="relative z-40 -mb-px overflow-x-auto bg-transparent pt-2">
          <div className="flex min-w-max items-end">
            {orderedSubjects.map((subject, index) => {
              const active = subject.schedule_time_id === selected.schedule_time_id;
              return (
                <button
                  key={subject.schedule_time_id}
                  type="button"
                  onClick={() => setSelectedId(subject.schedule_time_id)}
                  style={{
                    zIndex: active
                      ? orderedSubjects.length + 1
                      : orderedSubjects.length - index,
                  }}
                  className={`relative -ml-[52px] w-[104px] rounded-t-[9px] border border-b-0 px-2 py-1 text-center text-[10px] leading-[12px] shadow-[0_-2px_6px_rgba(69,117,143,0.08)] transition-all first:ml-0 ${
                    active
                      ? "h-[42px] border-[#68B1D6] bg-[#78C0E4] font-semibold text-white shadow-[0_-3px_9px_rgba(69,140,177,0.18)]"
                      : "mt-1 h-[38px] border-[#BDD7E4] bg-[#DDEEF6] font-medium text-[#527184] hover:-translate-y-0.5 hover:bg-[#D1E9F4]"
                  }`}
                >
                  <span className="line-clamp-2">{subject.subject_name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative z-30 overflow-hidden rounded-b-[20px] rounded-tr-[20px] border border-[#DCE8ED] bg-white shadow-[0_7px_18px_rgba(55,93,112,0.12)]">
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold leading-5 text-[#31566C]">
                <span className="mr-1.5 text-[#5B849A]">{selected.subject_id}</span>
                <span>{selected.subject_name}</span>
              </h2>
              <p className="mt-1.5 truncate text-xs font-medium text-[#5F7887]">
                ผู้สอน {selected.teacher_name || "ไม่ระบุ"}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[#EEF7FB] px-2.5 py-1 text-xs text-[#668A9E]">
              {selected.credits} หน่วยกิต
            </span>
          </div>

          <div className="mt-3 flex items-end gap-2.5 text-xs font-medium text-[#526F80]">
            <span className="shrink-0">
              เกรดปัจจุบัน
              <strong className="ml-1 rounded-full bg-[#EDF2F5] px-2 py-0.5 text-[#587384]">
                {currentGrade}
              </strong>
            </span>
            <span className="shrink-0">
              เป้าหมาย
              <strong className="ml-1 rounded-full bg-[#E6F5FD] px-2 py-0.5 text-[#4DA7D8]">
                {selected.target_grade}
              </strong>
            </span>
            <div className="min-w-[74px] flex-1 pb-0.5">
              <p className="mb-1 text-right text-[10px] font-semibold leading-none text-[#58A9D5]">
                {progressPercent.toFixed(0)}%
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E7F0F4]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#86CBEF] to-[#58B2E3] transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-3 mb-3 overflow-hidden rounded-xl border border-[#EFC9D7]">
          <div className="grid grid-cols-[34px_minmax(0,1fr)_88px_62px] bg-[#F8D8E3] px-2 py-2 text-[11px] font-medium text-[#925B70]">
            <span>ลำดับ</span>
            <span>งาน</span>
            <span className="text-center">ประเภท</span>
            <span className="text-right">คะแนน</span>
          </div>
          {completedWorkloads.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-7 text-center">
              <ClipboardList className="h-6 w-6 text-[#D89BAF]" aria-hidden="true" />
              <p className="mt-2 text-xs font-medium text-[#825C69]">ยังไม่มีงานในวิชานี้</p>
            </div>
          ) : (
            <div className="max-h-[180px] overflow-y-auto">
              {completedWorkloads.map((workload, index) => {
                const palette = getWorkloadPalette(workload.workload_type_name);
                return (
                  <div
                    key={workload.workload_id}
                    className="grid grid-cols-[34px_minmax(0,1fr)_88px_62px] items-center border-t border-[#F5E1E8] bg-[#FFFBFC] px-2 py-2 text-[11px] text-[#765E67] first:border-t-0"
                  >
                    <span className="font-medium text-[#667D89]">{index + 1}</span>
                    <span className="truncate pr-2">{workload.workload_name}</span>
                    <span
                      className="mx-auto max-w-[80px] truncate rounded-full border border-black/30 px-2 py-1 text-center text-black/60"
                      style={{ backgroundColor: palette.normal }}
                    >
                      {workload.workload_type_name}
                    </span>
                    <button
                      type="button"
                      onClick={() => openScoreEntry(workload)}
                      className="justify-self-end rounded-full px-2 py-1 text-right font-medium text-[#A85370] transition hover:bg-[#F9DFE8]"
                      aria-label={`กรอกคะแนน ${workload.workload_name}`}
                    >
                      {workload.actual_score !== null && workload.max_score !== null
                        ? `${workload.actual_score}/${workload.max_score}`
                        : "กรอก"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-end gap-3 border-t border-[#EFC9D7] bg-[#FCE7EE] px-3 py-2 text-xs text-[#925B70]">
            <span>คะแนนรวม</span>
            <strong className="rounded-full bg-white px-3 py-1 text-[#B05D79] shadow-sm">
              {formatScore(summary.actual)}/100
            </strong>
          </div>
        </div>
        </div>
      </section>

      {editingWorkload && (
        <ScoreEntryModal
          workload={editingWorkload}
          maximumAllowed={Math.max(
            0,
            100 -
              completedWorkloads
                .filter((item) => item.workload_id !== editingWorkload.workload_id)
                .reduce((sum, item) => sum + Number(item.max_score ?? 0), 0)
          )}
          isSaving={isSavingScore}
          serverError={scoreError}
          onClose={() => !isSavingScore && setEditingWorkload(null)}
          onSave={(input) => void saveScore(input)}
        />
      )}
    </div>
  );
}
