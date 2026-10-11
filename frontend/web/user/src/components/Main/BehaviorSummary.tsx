"use client";

import { useEffect, useState } from "react";
import { BookOpenCheck, Clock3, ListChecks, Sparkles } from "lucide-react";
import timeService from "@/services/time.service";
import examService from "@/services/exam.service";
import gradeService from "@/services/grade.service";
import recommendationService from "@/services/recommendation.service";
import type { StudyDashboard } from "@/interfaces/time.interface";
import type { ExamHistoryItem, ExamInsights } from "@/interfaces/exam.interface";
import type { SubjectGoalsResponse } from "@/interfaces/grade.interface";
import type { WeeklyRecommendation } from "@/interfaces/recommendation.interface";

export default function BehaviorSummary() {
  const [study, setStudy] = useState<StudyDashboard | null>(null);
  const [exams, setExams] = useState<ExamHistoryItem[]>([]);
  const [insights, setInsights] = useState<ExamInsights | null>(null);
  const [grades, setGrades] = useState<SubjectGoalsResponse | null>(null);
  const [latestPlan, setLatestPlan] = useState<WeeklyRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      timeService.getDashboard(),
      examService.getHistory(),
      examService.getInsights(),
      gradeService.getSubjectGoals(),
      recommendationService.getLatest(),
    ]).then(([studyResult, examResult, insightResult, gradeResult, planResult]) => {
      if (!active) return;
      if (studyResult.status === "fulfilled") setStudy(studyResult.value);
      if (examResult.status === "fulfilled") setExams(examResult.value);
      if (insightResult.status === "fulfilled") setInsights(insightResult.value);
      if (gradeResult.status === "fulfilled") setGrades(gradeResult.value);
      if (planResult.status === "fulfilled") setLatestPlan(planResult.value);
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const studyHours = (Number(study?.summary.total_term_minutes ?? 0) / 60).toFixed(1);
  const avgExamPercent = exams.length
    ? Math.round(exams.reduce((sum, exam) => sum + (exam.maximumScore > 0 ? exam.actualScore / exam.maximumScore * 100 : 0), 0) / exams.length)
    : null;
  const completedTasks = grades?.data.flatMap((subject) => subject.workloads)
    .filter((workload) => [true, 1, "1", "completed", "complete", "done"].includes(workload.workload_status as never)).length ?? 0;
  const recordedScores = grades?.data.flatMap((subject) => subject.workloads)
    .filter((workload) => workload.actual_score !== null).length ?? 0;
  const weakest = [...(insights?.weakTopics ?? [])]
    .sort((left, right) => left.percentage - right.percentage)
    .filter((topic, index, topics) => topics.findIndex((candidate) => candidate.subjectId === topic.subjectId) === index);
  const sessionCount = study?.history.reduce((sum, month) => sum + month.session_count, 0) ?? 0;
  const adherenceValues = latestPlan?.items.map((item) => item.previous_adherence_rate).filter((rate): rate is number => rate !== null) ?? [];
  const adherence = adherenceValues.length ? Math.round(adherenceValues.reduce((sum, rate) => sum + rate, 0) / adherenceValues.length) : null;

  return (
    <section className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-[#DEDDEA] bg-[#FCFBFE] shadow-[0_5px_12px_rgba(75,93,102,0.12)]">
      <header className="flex shrink-0 items-center gap-2 border-b border-[#E9DFEB] bg-gradient-to-r from-[#EAF5FA] to-[#FDEDF4] px-4 py-3 text-[#587889]">
        <Sparkles className="h-4 w-4" />
        <div>
          <h2 className="text-sm font-semibold">สรุปพฤติกรรมการเรียนในเทอมนี้</h2>
          <p className="text-[11px] text-[#7895A2]">ข้อมูลจากเวลาทบทวน แบบทดสอบ และภาระงานที่บันทึกไว้</p>
        </div>
      </header>
      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[#82969F]">กำลังรวบรวมสถิติ...</div>
      ) : (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-2">
            <Metric tone="blue" icon={<Clock3 className="h-4 w-4" />} label="เวลาทบทวนรวม" value={`${studyHours} ชม.`} detail={`จับเวลา ${sessionCount} ครั้ง · เฉลี่ย ${Math.round(study?.summary.average_weekly_minutes ?? 0)} นาที/สัปดาห์`} />
            <Metric tone="pink" icon={<BookOpenCheck className="h-4 w-4" />} label="แบบทดสอบ" value={`${exams.length} ครั้ง`} detail={avgExamPercent === null ? "ยังไม่มีคะแนนแบบทดสอบ" : `คะแนนเฉลี่ย ${avgExamPercent}%`} />
            <Metric tone="blue" icon={<ListChecks className="h-4 w-4" />} label="ภาระงาน" value={`${completedTasks} งานเสร็จ`} detail={`บันทึกคะแนนแล้ว ${recordedScores} รายการ`} />
            <Metric tone="pink" icon={<Sparkles className="h-4 w-4" />} label="Checkpoint" value={`${insights?.nextCheckpoints.length ?? 0} รอบ`} detail="รอบทบทวนที่ระบบนัดไว้" />
            <Metric tone="blue" icon={<Sparkles className="h-4 w-4" />} label="ทำตามตารางที่แนะนำ" value={adherence === null ? "ยังไม่มีข้อมูล" : `${adherence}%`} detail="อัตราที่ระบบคำนวณจากเวลาจับซ้อนกับแผนล่าสุด" />
          </div>
          <div className="rounded-xl border border-[#F2D9E5] bg-white p-3">
            <h3 className="text-xs font-semibold text-[#9C637E]">หัวข้อที่ควรทบทวนต่อ</h3>
            {weakest.length ? (
              <div className="mt-2 space-y-1.5">
                {weakest.map((topic, index) => (
                  <div key={`${topic.subjectId}-${topic.topicName}-${index}`} className="flex items-center justify-between gap-2 rounded-lg bg-[#FFF3F8] px-2.5 py-1.5 text-[11px] text-[#805E73]">
                    <span className="min-w-0"><strong className="block truncate">{topic.subjectName}</strong><span className="block truncate">{topic.topicName}</span></span>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[#C16D98]">{Math.round(topic.percentage)}%</span>
                  </div>
                ))}
              </div>
            ) : <p className="mt-1.5 text-[11px] text-[#9B8993]">ยังไม่มีหัวข้ออ่อนจากผลแบบทดสอบ</p>}
          </div>
          <p className="px-1 text-[10px] leading-4 text-[#A18F99]">สรุปนี้อ้างอิงเฉพาะข้อมูลที่ระบบบันทึกได้ จึงไม่ประเมินพฤติกรรมที่ไม่ได้กดจับเวลาหรือไม่ได้ทำแบบทดสอบ</p>
        </div>
      )}
    </section>
  );
}

function Metric({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: "blue" | "pink" }) {
  const colors = { blue: "border-[#CFE4ED] bg-[#F2FAFD] text-[#587889]", pink: "border-[#F2D9E5] bg-[#FFF1F7] text-[#9C637E]" };
  return <div className={`rounded-xl border p-3 ${colors[tone]}`}>
    <div className="flex items-center gap-1.5">{icon}<span className="text-[10px] font-medium">{label}</span></div>
    <p className="mt-1 text-base font-semibold leading-5">{value}</p>
    <p className="mt-0.5 truncate text-[10px] opacity-80">{detail}</p>
  </div>;
}
