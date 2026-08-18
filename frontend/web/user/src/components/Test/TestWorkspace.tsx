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
  const [examSubjectId, setExamSubjectId] = useState<string | null>(null);
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
        setExamSubjectId(null);
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
      setExamSubjectId((current) =>
        examData.some((exam) => exam.subjectId === current)
          ? current
          : examData[0]?.subjectId ?? null
      );
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
        setExamSubjectId(examData[0]?.subjectId ?? null);
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

  const examSubjects = useMemo(
    () =>
      Array.from(
        new Map(exams.map((exam) => [exam.subjectId, exam])).values()
      ),
    [exams]
  );

  const visibleExams = useMemo(
    () => exams.filter((exam) => exam.subjectId === examSubjectId),
    [examSubjectId, exams]
  );

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
    <div className="relative h-full w-full overflow-y-auto md:overflow-hidden">
      {loadError && (
        <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full bg-red-50 px-4 py-1.5 text-xs text-red-600 shadow">
          {loadError}
        </div>
      )}

      <div className="grid min-h-full grid-cols-1 gap-10 md:h-full md:grid-cols-[calc(50%-36px)_calc(50%-36px)] md:justify-between md:gap-[72px]">
        <section className="min-h-0 space-y-6 overflow-y-auto px-1 pb-4 pr-2 md:-ml-4 md:pl-4">
          <div>
            <SectionHeading
              title="แบบทดสอบ"
              detail="แบบทดสอบที่ถึงรอบ Checkpoint"
            />

            {examSubjects.length > 0 && examSubjectId && (
              <>
                <ExamSubjectTabs
                  subjects={examSubjects}
                  selectedSubjectId={examSubjectId}
                  onSubjectChange={setExamSubjectId}
                />
                <div className="relative z-30 -mt-[2px] rounded-b-[20px] rounded-tr-[20px] border border-[#DCE8ED] bg-white p-3 shadow-[0_7px_18px_rgba(55,93,112,0.12)]">
                  <ExamListPanel
                    exams={visibleExams}
                    openingExamId={openingExamId}
                    onOpen={(exam) => void openExam(exam)}
                  />
                </div>
              </>
            )}

            {examSubjects.length === 0 && (
              <div className="mt-3.5">
              <ExamListPanel
                exams={visibleExams}
                openingExamId={openingExamId}
                onOpen={(exam) => void openExam(exam)}
              />
              </div>
            )}
          </div>

          <ExamHistoryPanel
            history={history}
            selectedSubjectId={historySubjectId}
            onSubjectChange={setHistorySubjectId}
          />
        </section>

        <section className="flex min-h-[620px] flex-col md:min-h-0">
          <SectionHeading
            title="Feedback"
            detail="คำแนะนำและแผนทบทวนหลังทำแบบทดสอบ"
          />
          <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto px-1 pb-4 pr-2">
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
              <div className="flex min-h-40 items-center justify-center rounded-2xl border border-[#DCE7EB] bg-white/80 px-5 text-center text-sm text-[#8A9CA4]">
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

function SectionHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <header className="mb-3">
      <h1 className="text-lg font-semibold leading-tight text-[#405B69]">
        {title}
      </h1>
      <p className="mt-1 text-xs text-[#82969F]">{detail}</p>
    </header>
  );
}

function ExamSubjectTabs({
  subjects,
  selectedSubjectId,
  onSubjectChange,
}: {
  subjects: ExamSummary[];
  selectedSubjectId: string;
  onSubjectChange: (subjectId: string) => void;
}) {
  const selectedSubject =
    subjects.find((subject) => subject.subjectId === selectedSubjectId) ??
    subjects[0];
  const orderedSubjects = [
    selectedSubject,
    ...subjects.filter(
      (subject) => subject.subjectId !== selectedSubject.subjectId
    ),
  ];

  return (
    <div className="relative z-40 -mb-px h-11 max-w-full overflow-x-auto bg-transparent">
      <div className="flex min-w-max items-end pr-2">
        {orderedSubjects.map((subject, index) => {
          const selected = subject.subjectId === selectedSubjectId;
          return (
            <button
              key={subject.subjectId}
              type="button"
              onClick={() => onSubjectChange(subject.subjectId)}
              style={{
                zIndex: selected
                  ? orderedSubjects.length + 1
                  : orderedSubjects.length - index,
              }}
              className={`relative -ml-[52px] w-[104px] rounded-t-[9px] border border-b-0 px-2 py-1 text-center text-[10px] leading-[12px] shadow-[0_-2px_6px_rgba(69,117,143,0.08)] transition-all first:ml-0 ${
                selected
                  ? "h-[42px] border-[#68B1D6] bg-[#78C0E4] font-semibold text-white shadow-[0_-3px_9px_rgba(69,140,177,0.18)]"
                  : "mt-1 h-[38px] border-[#BDD7E4] bg-[#DDEEF6] font-medium text-[#527184] hover:-translate-y-0.5 hover:bg-[#D1E9F4]"
              }`}
              title={subject.subjectName}
            >
              <span className="line-clamp-2">{subject.subjectName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
