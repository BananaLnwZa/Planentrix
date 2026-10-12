"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MainNotebookScreen from "@/components/common/MainNotebookScreen";
import Schedule from "@/components/Main/Schedule";
import StudentCard from "@/components/Main/StudentCard";
import Term from "@/components/Main/Term";
import MainNotificationCard from "@/components/Main/MainNotificationCard";
import RecommendationCard from "@/components/Main/RecommendationCard";
import gradeService from "@/services/grade.service";
import termService from "@/services/term.service";
import BehaviorSummary from "@/components/Main/BehaviorSummary";
import type { TermWorkflow } from "@/interfaces/term.interface";
import ExamFlowNotice from "@/components/Main/ExamFlowNotice";

export default function MainPage() {
  const router = useRouter();
  const [termVersion, setTermVersion] = useState(0);
  const [scheduleVersion, setScheduleVersion] = useState(0);
  const [recommendationVersion, setRecommendationVersion] = useState(0);
  const [alertVersion, setAlertVersion] = useState(0);
  const [hasSavedGradeGoals, setHasSavedGradeGoals] = useState(false);
  const [workflow, setWorkflow] = useState<TermWorkflow | null>(null);
  const [showMidtermFollowup, setShowMidtermFollowup] = useState(false);

  useEffect(() => {
    let active = true;
    termService.getWorkflow().then((current) => {
      if (!active) return;
      setWorkflow(current);
      setShowMidtermFollowup(Boolean(current?.midterm_followup_pending));
    }).catch(() => active && setWorkflow(null));
    return () => { active = false; };
  }, [termVersion]);

  useEffect(() => {
    let active = true;

    gradeService
      .getSubjectGoals()
      .then((response) => {
        if (active) setHasSavedGradeGoals(Boolean(response?.goals_locked));
      })
      .catch(() => {
        if (active) setHasSavedGradeGoals(false);
      });

    return () => {
      active = false;
    };
  }, [termVersion]);

  const handleTermChange = () => {
    window.dispatchEvent(new Event("term-workflow-updated"));
    setHasSavedGradeGoals(false);
    setTermVersion((version) => version + 1);
    setScheduleVersion((version) => version + 1);
    setRecommendationVersion((version) => version + 1);
  };

  return (
    <>
    <MainNotebookScreen activeTab="main">
      <div className="grid h-full min-h-0 w-full grid-cols-1 gap-8 md:grid-cols-2 md:gap-16">
        <div className="relative flex h-full min-h-0 flex-col items-center gap-3 md:-translate-x-3">
          <div className="flex w-full max-w-[440px] shrink-0 items-stretch gap-3">
            <div className="w-[42%] min-w-0">
              <Term
                compact
                endTermMode={Boolean(workflow?.post_final)}
                onConfirm={handleTermChange}
                onEndTerm={handleTermChange}
              />
            </div>
            <MainNotificationCard
              refreshKey={
                termVersion +
                scheduleVersion +
                recommendationVersion +
                alertVersion
              }
            />
          </div>
          {workflow && workflow.phase !== "normal" && !workflow.post_final && (
            <ExamFlowNotice workflow={workflow} />
          )}
          {workflow?.post_final ? (
            <BehaviorSummary key={termVersion} />
          ) : (
            <Schedule
              key={termVersion}
              refreshKey={scheduleVersion}
              readOnly={workflow?.phase === "final_exam"}
              onChanged={() => setAlertVersion((version) => version + 1)}
            />
          )}
        </div>
        <div className="flex h-full min-h-0 flex-col items-center gap-4 overflow-hidden md:translate-x-3">
          <div className="flex w-full shrink-0 justify-center">
            <StudentCard
              key={termVersion}
              onConstraintUpdated={() =>
                setRecommendationVersion((version) => version + 1)
              }
            />
          </div>
          {hasSavedGradeGoals && !workflow?.post_final && workflow?.phase !== "midterm_exam" && workflow?.phase !== "final_exam" && (
            <RecommendationCard
              refreshKey={recommendationVersion + termVersion}
              onAccepted={() => setScheduleVersion((version) => version + 1)}
            />
          )}
        </div>
      </div>
    </MainNotebookScreen>
      {showMidtermFollowup && workflow && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]">
          <section role="dialog" aria-modal="true" aria-labelledby="midterm-followup-title" className="w-full max-w-md rounded-2xl border border-[#CFE4ED] bg-[#FFFDFE] p-6 text-center shadow-2xl" style={{ fontFamily: "var(--font-sansation)" }}>
            <h2 id="midterm-followup-title" className="text-base font-semibold text-[#405B69]">หลังสอบกลางภาค</h2>
            <p className="mt-2 text-sm leading-6 text-[#71858E]">เพิ่มรายการสอบกลางภาคและกรอกคะแนนในหน้าการบ้าน{workflow.initial_final_test_pending ? " พร้อมทำแบบทดสอบปลายภาคครั้งแรกให้ครบทุกวิชาที่มีข้อสอบ เพื่อเริ่มนัด checkpoint รอบใหม่" : ""}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={async () => {
                await termService.acknowledgeMidtermFollowup();
                setShowMidtermFollowup(false);
              }} className="rounded-full border border-[#B7D1DC] bg-white px-4 py-2 text-sm text-[#6A8795]">ไว้ก่อน</button>
              <button type="button" onClick={async () => {
                await termService.acknowledgeMidtermFollowup();
                setShowMidtermFollowup(false);
                router.push("/Score&Homework");
              }} className="rounded-full bg-[#8BC9E5] px-4 py-2 text-sm font-semibold text-white">ไปหน้าการบ้าน</button>
              {workflow.initial_final_test_pending && <button type="button" onClick={async () => {
                await termService.acknowledgeMidtermFollowup();
                setShowMidtermFollowup(false);
                router.push("/Test");
              }} className="rounded-full bg-[#9DCB83] px-4 py-2 text-sm font-semibold text-white">ทำแบบทดสอบปลายภาค</button>}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
