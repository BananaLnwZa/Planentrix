"use client";

import { useCallback, useEffect, useState } from "react";
import { BookX, CircleAlert, LoaderCircle, RefreshCw } from "lucide-react";
import type {
  SaveGradeGoalItem,
  SubjectGoalsResponse,
} from "@/interfaces/grade.interface";
import gradeService from "@/services/grade.service";
import GradeGoalModal from "./GradeGoalModal";
import GradeGoalPrompt from "./GradeGoalPrompt";
import ScoreDashboard from "./ScoreDashboard";

export default function ScoreHomeworkContent() {
  const [data, setData] = useState<SubjectGoalsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setData(await gradeService.getSubjectGoals());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    gradeService
      .getSubjectGoals()
      .then((result) => {
        if (isActive) setData(result);
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
      const refreshed = await gradeService.getSubjectGoals();
      setData(refreshed);
      setIsGoalModalOpen(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative h-full w-full md:w-[calc(50%-26px)] md:pr-1">
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
        <StateMessage
          icon={<BookX className="h-7 w-7" />}
          title="ยังไม่มีเทอมปัจจุบัน"
          detail="กรุณาสร้างเทอมและตารางเรียนก่อนตั้งเป้าหมายเกรด"
        />
      ) : data.data.length === 0 ? (
        <StateMessage
          icon={<BookX className="h-7 w-7" />}
          title="ยังไม่พบรายวิชา"
          detail="ไม่พบวิชาเรียนประเภท Class ในเทอมปัจจุบัน"
          actionLabel="โหลดใหม่"
          onAction={() => void loadGoals()}
        />
      ) : data.goals_locked ? (
        <ScoreDashboard subjects={data.data} />
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
        <p className="mx-auto mt-2 max-w-[290px] text-sm leading-6 text-[#7893A2]">
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
