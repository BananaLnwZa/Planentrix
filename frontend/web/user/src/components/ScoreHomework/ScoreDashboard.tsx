"use client";

import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import type { GradeWorkload, SubjectGradeGoal } from "@/interfaces/grade.interface";
import GpaGauge from "./GpaGauge";

const workloadColors = [
  "bg-[#F9D2DF] text-[#9D506A]",
  "bg-[#F6C4D5] text-[#95435F]",
  "bg-[#FCE1E9] text-[#A85D76]",
  "bg-[#EFB6CA] text-[#873D57]",
];

const getScoreSummary = (workloads: GradeWorkload[]) => {
  const scored = workloads.filter(
    (workload) => workload.actual_score !== null && workload.max_score !== null
  );
  const actual = scored.reduce((sum, workload) => sum + Number(workload.actual_score), 0);
  const maximum = scored.reduce((sum, workload) => sum + Number(workload.max_score), 0);
  return { actual, maximum, percent: maximum > 0 ? (actual / maximum) * 100 : 0 };
};

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

export default function ScoreDashboard({ subjects }: { subjects: SubjectGradeGoal[] }) {
  const [selectedId, setSelectedId] = useState(subjects[0]?.schedule_time_id);
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
      const subjectScore = getScoreSummary(subject.workloads);
      const subjectGpa = subjectScore.maximum
        ? gpaFromPercent(subjectScore.percent)
        : 0;
      return sum + subjectGpa * subject.credits;
    }, 0);

    return currentPoints / totalCredits;
  }, [subjects]);

  if (!selected) return null;
  const summary = getScoreSummary(selected.workloads);
  const currentGrade = gradeFromPercent(summary.percent, summary.maximum > 0);

  return (
    <div className="space-y-4 pb-4">
      <GpaGauge currentGpa={currentGpa} targetGpa={targetGpa} />

      <section className="overflow-hidden rounded-[20px] border border-[#DCE8ED] bg-white shadow-[0_7px_18px_rgba(55,93,112,0.12)]">
        <div className="overflow-x-auto border-b border-[#C8DFEA] bg-[#F8FCFE]">
          <div className="flex min-w-max items-end px-2 pt-2">
            {subjects.map((subject) => {
              const active = subject.schedule_time_id === selected.schedule_time_id;
              return (
                <button
                  key={subject.schedule_time_id}
                  type="button"
                  onClick={() => setSelectedId(subject.schedule_time_id)}
                  className={`h-[38px] w-[92px] rounded-t-[7px] border border-b-0 border-r-0 px-1.5 py-1 text-center text-[10px] leading-[12px] transition last:border-r ${
                    active
                      ? "border-[#75B9DB] bg-[#82C6E7] font-semibold text-white"
                      : "border-[#BDD7E4] bg-[#DDEEF6] text-[#7392A2] hover:bg-[#D1E9F4]"
                  }`}
                >
                  <span className="line-clamp-2">{subject.subject_name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold leading-5 text-[#31566C]">
                <span className="mr-1.5 text-[#5B849A]">{selected.subject_id}</span>
                <span>{selected.subject_name}</span>
              </h2>
              <p className="mt-0.5 truncate text-xs text-[#83A0AF]">
                อ.ผู้สอน {selected.teacher_name || "ไม่ระบุ"}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[#EEF7FB] px-2.5 py-1 text-xs text-[#668A9E]">
              {selected.credits} หน่วยกิต
            </span>
          </div>

          <div className="mt-3 flex items-end gap-2.5 text-xs text-[#7793A2]">
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
                {summary.maximum ? `${summary.percent.toFixed(0)}%` : "—"}
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E7F0F4]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#86CBEF] to-[#58B2E3] transition-all"
                  style={{ width: `${Math.min(100, summary.percent)}%` }}
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
          {selected.workloads.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-7 text-center">
              <ClipboardList className="h-6 w-6 text-[#D89BAF]" aria-hidden="true" />
              <p className="mt-2 text-xs text-[#A67A89]">ยังไม่มีงานในวิชานี้</p>
            </div>
          ) : (
            <div className="max-h-[180px] overflow-y-auto">
              {selected.workloads.map((workload, index) => (
                <div
                  key={workload.workload_id}
                  className="grid grid-cols-[34px_minmax(0,1fr)_88px_62px] items-center border-t border-[#F5E1E8] bg-[#FFFBFC] px-2 py-2 text-[11px] text-[#765E67] first:border-t-0"
                >
                  <span className="text-[#9AAEB8]">{index + 1}</span>
                  <span className="truncate pr-2">{workload.workload_name}</span>
                  <span
                    className={`mx-auto max-w-[80px] truncate rounded-full px-2 py-1 text-center ${
                      workloadColors[index % workloadColors.length]
                    }`}
                  >
                    {workload.workload_type_name}
                  </span>
                  <span className="text-right font-medium">
                    {workload.actual_score ?? "—"}/{workload.max_score ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-end gap-3 border-t border-[#EFC9D7] bg-[#FCE7EE] px-3 py-2 text-xs text-[#925B70]">
            <span>คะแนนสะสม</span>
            <strong className="rounded-full bg-white px-3 py-1 text-[#B05D79] shadow-sm">
              {summary.actual}/{summary.maximum || "—"}
            </strong>
          </div>
        </div>
      </section>
    </div>
  );
}
