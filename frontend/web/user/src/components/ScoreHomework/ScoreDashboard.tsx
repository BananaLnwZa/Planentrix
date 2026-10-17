"use client";

import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import type {
  GradeBoundary,
  GradeWorkload,
  OverallGradeSummary,
  SubjectGradeGoal,
  WorkloadScoreInput,
} from "@/interfaces/grade.interface";
import gradeService from "@/services/grade.service";
import GpaGauge from "./GpaGauge";
import ScoreEntryModal from "./ScoreEntryModal";
import { getWorkloadPalette, getWorkloadTypeLabel } from "./homeworkUtils";
import { GPA_BY_GRADE } from "./gradeOptions";

const getScoreSummary = (workloads: GradeWorkload[]) => {
  const scored = workloads.filter(
    (workload) => workload.actual_score !== null && workload.max_score !== null
  );
  const actual = Math.max(
    0,
    scored.reduce((sum, workload) => sum + Number(workload.actual_score), 0)
  );
  const maximum = Math.max(
    0,
    scored.reduce((sum, workload) => sum + Number(workload.max_score), 0)
  );
  // Course grading uses earned points out of 100, not the average over
  // only the workloads whose scores have been entered so far.
  const percent = maximum > 0 ? Math.min(100, actual) : 0;
  return { actual, maximum, percent };
};

const formatScore = (value: number) =>
  Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");

const boundaryForPercent = (
  percent: number,
  boundaries: GradeBoundary[]
) =>
  [...boundaries]
    .sort(
      (left, right) =>
        right.minimum_percentage - left.minimum_percentage ||
        left.display_order - right.display_order
    )
    .find((boundary) => percent >= boundary.minimum_percentage) ?? null;

const getGoalProgressPercent = (
  earnedPoints: number,
  targetMinimumPercentage: number | null
) => {
  if (targetMinimumPercentage === null) return 0;
  if (targetMinimumPercentage === 0) return 100;
  return Math.min(
    100,
    Math.max(0, (earnedPoints / targetMinimumPercentage) * 100)
  );
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
  canEditScores = true,
  showFinalScoreTarget = false,
}: {
  subjects: SubjectGradeGoal[];
  overall: OverallGradeSummary | null;
  onSubjectsChange: (subjects: SubjectGradeGoal[]) => void;
  onScoreSaved: () => void;
  canEditScores?: boolean;
  showFinalScoreTarget?: boolean;
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
    let evaluatedCredits = 0;
    const currentPoints = subjects.reduce((sum, subject) => {
      const subjectScore = getScoreSummary(
        subject.workloads.filter((workload) => isCompleted(workload.workload_status))
      );
      const boundary =
        subjectScore.maximum > 0 && subject.grading_scheme
          ? boundaryForPercent(
            subjectScore.percent,
            subject.grading_scheme.boundaries
          )
          : null;
      if (!boundary) return sum;
      evaluatedCredits += subject.credits;
      return sum + GPA_BY_GRADE[boundary.grade_code] * subject.credits;
    }, 0);
    return evaluatedCredits ? currentPoints / evaluatedCredits : 0;
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
  const currentBoundary = selected.grading_scheme
    ? boundaryForPercent(summary.percent, selected.grading_scheme.boundaries)
    : null;
  const progressPercent = getGoalProgressPercent(
    summary.actual,
    selected.target_minimum_percentage
  );
  const currentGrade =
    summary.maximum <= 0
      ? "—"
      : !selected.grading_scheme
        ? "รอเกณฑ์"
        : currentBoundary?.grade_code ?? "—";

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
    <div className="relative min-h-0 md:h-full">
      <div className="space-y-4 pb-4 md:h-full md:overflow-y-auto md:overscroll-contain md:pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <GpaGauge
          currentGpa={overall?.overall_actual_gpa ?? currentGpa}
          targetGpa={overall?.overall_target_gpa ?? targetGpa}
        />

        {showFinalScoreTarget && <section className="rounded-xl border border-[#CFE4ED] bg-[#F3FAFD] px-3 py-3">
          <h2 className="text-sm font-semibold text-[#456A7C]">คะแนนปลายภาคที่ต้องได้ตามเป้าหมาย</h2>
          <div className="mt-2 space-y-1.5">
            {subjects.map((subject) => {
              const scored = getScoreSummary(subject.workloads.filter((item) => isCompleted(item.workload_status)));
              const target = subject.target_minimum_percentage;
              const remaining = Math.max(0, 100 - scored.maximum);
              const needed = target === null ? null : Math.max(0, target - scored.actual);
              const reached = needed !== null && needed <= 0;
              const estimate = needed === null ? "รอเกณฑ์ตัดเกรด" : reached ? "ถึงเป้าหมายแล้ว" : `ต้องเพิ่ม ${formatScore(needed)} คะแนน`;
              return <div key={subject.schedule_time_id} className="rounded-lg bg-white px-3 py-2.5 text-xs">
                <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                  <span className="min-w-[10rem] flex-1 text-sm font-semibold leading-5 text-[#456A7C]">{subject.subject_name}</span>
                  <span className={`text-right text-xs font-semibold leading-5 ${needed !== null && needed > remaining ? "text-[#C87878]" : reached ? "text-[#62A47E]" : "text-[#528EB0]"}`}>{estimate}</span>
                </div>
                <p className="mt-0.5 text-[#8299A4]">
                  เป้า {subject.target_grade ?? "—"}{target === null ? " · ยังไม่มีคะแนนเกณฑ์" : ` ขั้นต่ำ ${formatScore(target)} คะแนน`}
                  {` · สะสมแล้ว ${formatScore(scored.actual)} คะแนน`}
                </p>
                {needed !== null && needed > remaining && <p className="mt-0.5 text-[#C87878]">คะแนนส่วนที่เหลือไม่เพียงพอให้ถึงเป้าหมายนี้</p>}
              </div>;
            })}
          </div>
        </section>}

        {overall && overall.pending_grading_scheme_count > 0 && (
          <p className="rounded-xl border border-[#F3D9A8] bg-[#FFF8E8] px-3 py-2 text-xs text-[#8A6A2C]">
            มี {overall.pending_grading_scheme_count} วิชาที่ยังรออาจารย์เผยแพร่เกณฑ์ตัดเกรด
            จึงยังไม่นำมาคำนวณ GPA ปัจจุบัน
          </p>
        )}

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
                    className={`relative -ml-[52px] w-[104px] rounded-t-[9px] border border-b-0 px-2 py-1 text-center text-[10px] leading-[12px] shadow-[0_-2px_6px_rgba(69,117,143,0.08)] transition-all first:ml-0 ${active
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
              {!selected.grading_scheme && (
                <p className="mt-2 rounded-lg bg-[#FFF8E8] px-2.5 py-2 text-[11px] text-[#8A6A2C]">
                  ยังไม่มีเกณฑ์ตัดเกรดที่อาจารย์เผยแพร่ ระบบจึงยังไม่คำนวณเกรดวิชานี้
                </p>
              )}
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
                    const palette = getWorkloadPalette(workload.workload_type_code);
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
                          {getWorkloadTypeLabel(workload.workload_type_code)}
                        </span>
                        <button
                          type="button"
                          onClick={() => openScoreEntry(workload)}
                          disabled={!canEditScores}
                          className="justify-self-end rounded-full px-2 py-1 text-right font-medium text-[#A85370] transition hover:bg-[#F9DFE8] disabled:cursor-not-allowed disabled:text-[#AFAFAF]"
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
                  {formatScore(summary.actual)}/{formatScore(summary.maximum)}
                </strong>
              </div>
            </div>
          </div>
        </section>

      </div>

      {editingWorkload && canEditScores && (
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
