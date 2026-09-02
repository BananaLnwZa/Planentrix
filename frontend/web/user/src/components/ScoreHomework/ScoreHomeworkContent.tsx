"use client";

import { useCallback, useEffect, useState } from "react";
import { BookX, CircleAlert, LoaderCircle, RefreshCw } from "lucide-react";
import type {
  OverallGradeSummary,
  SaveGradeGoalItem,
  SubjectGoalsResponse,
} from "@/interfaces/grade.interface";
import gradeService from "@/services/grade.service";
import GradeGoalModal from "./GradeGoalModal";
import GradeGoalPrompt from "./GradeGoalPrompt";
import HomeworkDashboard from "./HomeworkDashboard";
import ScoreDashboard from "./ScoreDashboard";
import {
  CurrentTermRequiredNotebookLayout,
} from "@/components/common/CurrentTermRequiredState";

export default function ScoreHomeworkContent() {
  const [data, setData] = useState<SubjectGoalsResponse | null>(null);
  const [overall, setOverall] = useState<OverallGradeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [goals, gradeOverall] = await Promise.all([
        gradeService.getSubjectGoals(),
        gradeService.getOverallGrade(),
      ]);
      setData(goals);
      setOverall(gradeOverall);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    Promise.all([gradeService.getSubjectGoals(), gradeService.getOverallGrade()])
      .then(([goals, gradeOverall]) => {
        if (isActive) {
          setData(goals);
          setOverall(gradeOverall);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setLoadError(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handleSave = async (goals: SaveGradeGoalItem[]) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await gradeService.saveGradeGoals({ goals });
      const [refreshed, gradeOverall] = await Promise.all([
        gradeService.getSubjectGoals(),
        gradeService.getOverallGrade(),
      ]);
      setData(refreshed);
      setOverall(gradeOverall);
      setIsGoalModalOpen(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoading && !loadError && !data) {
    return (
      <CurrentTermRequiredNotebookLayout
        leftDetail="กรุณาสร้างเทอมและตารางเรียนก่อนตั้งเป้าหมายเกรด"
        rightDetail="กรุณาสร้างเทอมและตารางเรียนก่อนเพิ่มงาน"
      />
    );
  }

  return (
    <div className="grid h-full w-full grid-cols-1 gap-10 md:grid-cols-[calc(50%-26px)_calc(50%-26px)] md:justify-between md:gap-[52px]">
    <div className="relative h-full min-h-[500px] w-full md:-left-4 md:pr-1 xl:-left-5">
      {isLoading ? (
        <div className="flex min-h-[430px] items-center justify-center text-[#6BAED3]">
          <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
          <span className="text-sm">กำลังโหลดข้อมูลคะแนน...</span>
        </div>
      ) : loadError ? (
        <StateMessage
          icon={<CircleAlert className="h-7 w-7" />}
          title="โหลดข้อมูลไม่สำเร็จ"
          detail={loadError}
          actionLabel="ลองอีกครั้ง"
          onAction={() => void loadGoals()}
        />
      ) : !data ? (
        <div />
      ) : data.data.length === 0 ? (
        <StateMessage
          icon={<BookX className="h-7 w-7" />}
          title="ยังไม่พบรายวิชา"
          detail="ไม่พบวิชาเรียนประเภท Class ในเทอมปัจจุบัน"
          actionLabel="โหลดใหม่"
          onAction={() => void loadGoals()}
        />
      ) : data.goals_locked ? (
        <ScoreDashboard
          subjects={data.data}
          overall={overall}
          onSubjectsChange={(subjects) =>
            setData((current) => (current ? { ...current, data: subjects } : current))
          }
          onScoreSaved={() => {
            void gradeService.getOverallGrade().then(setOverall).catch(() => undefined);
          }}
        />
      ) : (
        <GradeGoalPrompt
          subjectCount={data.data.length}
          onStart={() => {
            setSaveError(null);
            setIsGoalModalOpen(true);
          }}
        />
      )}

      {isGoalModalOpen && data && (
        <GradeGoalModal
          subjects={data.data}
          isSaving={isSaving}
          saveError={saveError}
          onClose={() => !isSaving && setIsGoalModalOpen(false)}
          onSave={(goals) => void handleSave(goals)}
        />
      )}
    </div>
      <HomeworkDashboard
        canAddHomework={Boolean(data?.goals_locked)}
        onHomeworkFinished={() => void loadGoals()}
      />
    </div>
  );
}

function StateMessage({
  icon,
  title,
  detail,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <section className="flex min-h-[430px] items-center justify-center p-3 text-center">
      <div className="w-full rounded-[26px] border border-[#CFE7F4] bg-[#F3FAFE] px-6 py-9">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#66B3DE] shadow-sm">
          {icon}
        </span>
        <h1 className="mt-4 text-lg font-semibold text-[#31566C]">{title}</h1>
        <p className="mx-auto mt-2 max-w-[290px] text-sm font-medium leading-6 text-[#566F7D]">
          {detail}
        </p>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#68B8E4] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#55ACDD]"
          >
            <RefreshCw className="h-4 w-4" />
            {actionLabel}
          </button>
        )}
      </div>
    </section>
  );
}
