"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleAlert, LoaderCircle, RefreshCw } from "lucide-react";
import type {
  ExamAnswer,
  ExamDetail,
  ExamHistoryItem,
  ExamInsights,
  ExamSubmissionResult,
  ExamSummary,
} from "@/interfaces/exam.interface";
import examService from "@/services/exam.service";
import termService from "@/services/term.service";
import {
  CurrentTermRequiredNotebookLayout,
} from "@/components/common/CurrentTermRequiredState";
import ExamListPanel from "./ExamListPanel";
import ExamHistoryPanel from "./ExamHistoryPanel";
import FeedbackPanel from "./FeedbackPanel";
import ExamModal from "./ExamModal";

const emptyInsights: ExamInsights = { weakTopics: [], nextCheckpoints: [] };

export default function TestWorkspace() {
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [history, setHistory] = useState<ExamHistoryItem[]>([]);
  const [insights, setInsights] = useState<ExamInsights>(emptyInsights);
  const [activeExam, setActiveExam] = useState<ExamDetail | null>(null);
  const [openingExamId, setOpeningExamId] = useState<number | null>(null);
  const [historySubjectId, setHistorySubjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCurrentTerm, setHasCurrentTerm] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setHasCurrentTerm(null);
    setLoadError(null);
    try {
      const currentTerm = await termService.getCurrentTerm();
      if (!currentTerm) {
        setExams([]);
        setHistory([]);
        setInsights(emptyInsights);
        setHistorySubjectId(null);
        setHasCurrentTerm(false);
        return;
      }
      setHasCurrentTerm(true);
      const [examData, historyData, insightData] = await Promise.all([
        examService.getExams(),
        examService.getHistory(),
        examService.getInsights(),
      ]);
      setExams(examData);
      setHistory(historyData);
      setInsights(insightData);
      setHistorySubjectId((current) => {
        if (historyData.some((item) => (item.subjectId || item.subjectName) === current)) {
          return current;
        }
        const first = historyData[0];
        return first ? first.subjectId || first.subjectName : null;
      });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "โหลดข้อมูลหน้า Test ไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    termService
      .getCurrentTerm()
      .then(async (currentTerm) => {
        if (!active) return;
        if (!currentTerm) {
          setHasCurrentTerm(false);
          return;
        }
        setHasCurrentTerm(true);
        const [examData, historyData, insightData] = await Promise.all([
          examService.getExams(),
          examService.getHistory(),
          examService.getInsights(),
        ]);
        if (!active) return;
        setExams(examData);
        setHistory(historyData);
        setInsights(insightData);
        const first = historyData[0];
        setHistorySubjectId(first ? first.subjectId || first.subjectName : null);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "โหลดข้อมูลหน้า Test ไม่สำเร็จ");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const feedbackSubjects = useMemo(() => {
    const subjects = new Map<string, string>();
    for (const topic of insights.weakTopics) {
      subjects.set(topic.subjectId || topic.subjectName, topic.subjectName);
    }
    for (const checkpoint of insights.nextCheckpoints) {
      subjects.set(
        checkpoint.subjectId || checkpoint.subjectName,
        checkpoint.subjectName
      );
    }
    return Array.from(subjects, ([id, name]) => ({ id, name }));
  }, [insights]);

  const openExam = async (summary: ExamSummary) => {
    if (openingExamId !== null) return;
    setOpeningExamId(summary.examRepositoryId);
    setLoadError(null);
    try {
      setActiveExam(await examService.getExamDetail(summary.examRepositoryId));
      setSubmitError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "โหลดรายละเอียดข้อสอบไม่สำเร็จ");
    } finally {
      setOpeningExamId(null);
    }
  };

  const submitExam = async (answers: ExamAnswer[]): Promise<ExamSubmissionResult | null> => {
    if (!activeExam || isSubmitting) return null;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await examService.submitExam(
        activeExam.summary.examRepositoryId,
        answers
      );
      await loadData();
      return result;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "ส่งข้อสอบไม่สำเร็จ");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !activeExam) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#6A8795]">
        <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> กำลังโหลดข้อมูล Test...
      </div>
    );
  }

  if (loadError && !exams.length && !history.length && !feedbackSubjects.length) {
    return (
      <div className="flex h-full items-center justify-center p-5 text-center">
        <div className="rounded-3xl border border-[#F1BBC8] bg-white/80 px-8 py-7 text-sm text-[#667C86]">
          <CircleAlert className="mx-auto h-8 w-8 text-[#E27691]" />
          <p className="mt-3">{loadError}</p>
          <button type="button" onClick={() => void loadData()} className="mt-4 inline-flex items-center gap-1 rounded-full border border-[#D3A4B1] px-4 py-2 text-xs text-[#B65D78]">
            <RefreshCw className="h-3.5 w-3.5" /> ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  if (hasCurrentTerm === false) {
    return (
      <CurrentTermRequiredNotebookLayout leftDetail="กรุณาสร้างเทอมและตารางเรียนก่อนทำแบบทดสอบ" />
    );
  }

  return (
    <div className="h-full overflow-y-auto rounded-[18px] md:-my-12 md:-mx-[52px] md:h-[calc(100%+6rem)] md:w-[calc(100%+6.5rem)] md:overflow-hidden md:pt-5">
      {loadError && (
        <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full bg-red-50 px-4 py-1.5 text-xs text-red-600 shadow">
          {loadError}
        </div>
      )}

      <div className="grid min-h-full grid-cols-1 md:h-full md:grid-cols-2 md:gap-3">
        <div className="flex min-h-[700px] flex-col border-[#D9B7BF] md:min-h-0 md:border-r">
          <section className="flex min-h-0 flex-[1.5] flex-col">
            <PageHeading>Test</PageHeading>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 md:px-8">
              <ExamListPanel exams={exams} openingExamId={openingExamId} onOpen={(exam) => void openExam(exam)} />
            </div>
          </section>

          <section className="flex min-h-0 flex-1 flex-col border-t border-[#D9AAB5]">
            <PageHeading>History</PageHeading>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-6">
              <ExamHistoryPanel
                history={history}
                selectedSubjectId={historySubjectId}
                onSubjectChange={setHistorySubjectId}
              />
            </div>
          </section>
        </div>

        <section className="flex min-h-[700px] flex-col md:min-h-0">
          <PageHeading>Feedback</PageHeading>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-5 md:px-8">
            {feedbackSubjects.length ? (
              feedbackSubjects.map((subject) => (
                <FeedbackPanel
                  key={subject.id}
                  subjectName={subject.name}
                  topics={insights.weakTopics.filter((topic) => (topic.subjectId || topic.subjectName) === subject.id)}
                  checkpoints={insights.nextCheckpoints.filter((checkpoint) => (checkpoint.subjectId || checkpoint.subjectName) === subject.id)}
                />
              ))
            ) : (
              <div className="flex min-h-40 items-center justify-center rounded-2xl border border-[#DCE7EB] bg-white/80 px-5 text-center text-xs text-[#8A9CA4]">
                ยังไม่มี Feedback จากการทำแบบทดสอบ
              </div>
            )}
          </div>
        </section>
      </div>

      {activeExam && (
        <ExamModal
          exam={activeExam}
          isSubmitting={isSubmitting}
          submitError={submitError}
          onClose={() => !isSubmitting && setActiveExam(null)}
          onSubmit={submitExam}
        />
      )}
    </div>
  );
}

function PageHeading({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="flex h-12 shrink-0 items-center justify-center border-y border-[#D9AAB5] bg-[#F8C5D0] text-[clamp(24px,3vw,32px)] font-medium text-[#4A3E41] first:border-t-0">
      {children}
    </h1>
  );
}
