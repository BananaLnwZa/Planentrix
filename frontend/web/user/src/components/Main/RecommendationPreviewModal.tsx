"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Pencil, Plus, X } from "lucide-react";
import type {
  RecurringClassBlock,
  WeeklyBlockInput,
  WeeklyRecommendation,
  WeeklyScheduleBlock,
} from "@/interfaces/recommendation.interface";
import type { DisplayScheduleItem } from "@/interfaces/table.interface";
import recommendationService from "@/services/recommendation.service";
import { formatDisplayDate } from "@/utils/dateTime";
import ScheduleGrid from "./ScheduleGrid";
import WeeklyBlockEditor from "./WeeklyBlockEditor";

type RecommendationPreviewModalProps = {
  recommendation: WeeklyRecommendation;
  onClose: () => void;
  onRecommendationChange: (value: WeeklyRecommendation) => void;
  onAccepted: (value: WeeklyRecommendation) => void;
};

const isoDay = (value: string) => {
  const day = new Date(`${value}T00:00:00`).getDay();
  return day === 0 ? 7 : day;
};

const toRecurringItem = (block: RecurringClassBlock): DisplayScheduleItem => ({
  schedule_time_id: block.schedule_time_id,
  display_id: `recurring-${block.schedule_time_id}`,
  source: "recurring",
  weekly_block_id: null,
  recommendation_id: null,
  scheduled_date: null,
  is_user_modified: false,
  schedule_type_id: 1,
  schedule_type_name: block.schedule_type_name,
  subject_id: block.subject_id,
  subject_name: block.subject_name,
  teacher_name: "",
  credits: 0,
  schedule_day: block.schedule_day,
  start_time: block.start_time.slice(0, 5),
  end_time: block.end_time.slice(0, 5),
  classroom: block.classroom,
  note: block.note,
});

const toWeeklyItem = (block: WeeklyScheduleBlock): DisplayScheduleItem => ({
  schedule_time_id: block.schedule_time_id,
  display_id: `weekly-${block.weekly_block_id}`,
  source: "weekly",
  weekly_block_id: block.weekly_block_id,
  recommendation_id: block.recommendation_id,
  scheduled_date: block.scheduled_date,
  is_user_modified: block.is_user_modified,
  schedule_type_id: block.schedule_type_id,
  schedule_type_name: block.schedule_type_name,
  subject_id: block.subject_id,
  subject_name: block.subject_name,
  teacher_name: "",
  credits: 0,
  schedule_day: isoDay(block.scheduled_date),
  start_time: block.start_time.slice(0, 5),
  end_time: block.end_time.slice(0, 5),
  classroom: null,
  note: null,
});

export default function RecommendationPreviewModal({
  recommendation,
  onClose,
  onRecommendationChange,
  onAccepted,
}: RecommendationPreviewModalProps) {
  const [recurringClasses, setRecurringClasses] = useState<
    RecurringClassBlock[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [selectedBlock, setSelectedBlock] =
    useState<WeeklyScheduleBlock | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    recommendationService
      .getWeeklySchedule(recommendation.week_start)
      .then((schedule) => {
        if (active) setRecurringClasses(schedule.recurring_classes);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "ไม่สามารถโหลดคาบเรียนประจำได้"
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [recommendation.week_start]);

  const displayItems = useMemo(
    () => [
      ...recurringClasses.map(toRecurringItem),
      ...recommendation.blocks.map(toWeeklyItem),
    ],
    [recommendation.blocks, recurringClasses]
  );
  const subjects = useMemo(() => {
    const map = new Map<string, string>();
    recurringClasses.forEach((item) => map.set(item.subject_id, item.subject_name));
    recommendation.items.forEach((item) =>
      map.set(item.subject_id, item.subject_name)
    );
    return [...map].map(([subject_id, subject_name]) => ({
      subject_id,
      subject_name,
    }));
  }, [recommendation.items, recurringClasses]);

  const handleSave = async (input: WeeklyBlockInput) => {
    setIsSaving(true);
    try {
      const updated = selectedBlock
        ? await recommendationService.updateBlock(
            recommendation.recommendation_id,
            selectedBlock.weekly_block_id,
            {
              scheduled_date: input.scheduled_date,
              start_time: input.start_time,
              end_time: input.end_time,
            }
          )
        : await recommendationService.addBlock(
            recommendation.recommendation_id,
            input
          );
      onRecommendationChange(updated);
      setSelectedBlock(null);
      setIsAdding(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBlock) return;
    setIsDeleting(true);
    try {
      const updated = await recommendationService.deleteBlock(
        recommendation.recommendation_id,
        selectedBlock.weekly_block_id
      );
      onRecommendationChange(updated);
      setSelectedBlock(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    setError("");
    try {
      const accepted = await recommendationService.accept(
        recommendation.recommendation_id
      );
      onAccepted(accepted);
    } catch (acceptError) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : "ไม่สามารถยอมรับคำแนะนำได้"
      );
    } finally {
      setIsAccepting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="recommendation-preview-title"
        className="relative flex max-h-[calc(100vh-32px)] w-full max-w-[1050px] flex-col overflow-hidden rounded-[24px] border border-[#D3C1C8] bg-[#FFFDF5] shadow-2xl"
        style={{ fontFamily: "var(--font-sansation)" }}
      >
        <header className="shrink-0 flex items-start justify-between gap-4 border-b border-[#E9DDE1] bg-white px-5 py-4 pr-14">
          <div>
            <h2
              id="recommendation-preview-title"
              className="flex items-center gap-2 text-lg font-semibold text-[#405B69]"
            >
              <CalendarDays size={20} className="text-[#6DA5B8]" />
              ตัวอย่างตารางสัปดาห์ที่แนะนำ
            </h2>
            <p className="mt-1 text-xs text-[#82939B]">
              {formatDisplayDate(recommendation.week_start)} –{" "}
              {formatDisplayDate(recommendation.week_end)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isAccepting || isSaving || isDeleting}
            aria-label="ปิดตัวอย่าง"
            className="absolute right-4 top-4 rounded-full p-1.5 text-[#D85E82] hover:bg-[#FFF0F5] disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
          <div className="flex h-[clamp(260px,52vh,390px)] min-h-0 overflow-hidden rounded-2xl border border-[#E4D8DC] bg-white p-3">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-[#78909C]">
                กำลังโหลดตัวอย่างตาราง...
              </div>
            ) : (
              <ScheduleGrid
                items={displayItems}
                onSelect={(item) => {
                  if (!isAdjusting || item.source !== "weekly") return;
                  setSelectedBlock(
                    recommendation.blocks.find(
                      (block) => block.weekly_block_id === item.weekly_block_id
                    ) ?? null
                  );
                }}
              />
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[#74878F]">
              {isAdjusting
                ? "กดบล็อกสีเหลืองหรือชมพูเพื่อย้าย เปลี่ยนเวลา หรือลบ"
                : "ตารางนี้ยังเป็นตัวอย่าง จนกว่าจะกดยอมรับคำแนะนำ"}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsAdjusting((value) => !value)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#BFD5DE] bg-white px-3.5 py-2 text-sm text-[#567E8E] hover:bg-[#F1F8FA]"
              >
                <Pencil size={15} />
                {isAdjusting ? "เสร็จสิ้นการปรับ" : "ปรับตารางก่อนใช้"}
              </button>
              {isAdjusting && (
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  disabled={subjects.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1C58A] bg-[#FFF8DF] px-3.5 py-2 text-sm text-[#896B2E] hover:bg-[#FFF1C4] disabled:opacity-50"
                >
                  <Plus size={16} /> เพิ่มบล็อก
                </button>
              )}
            </div>
          </div>

          {recommendation.items.some((item) => item.capacity_limited) && (
            <p className="mt-3 rounded-xl border border-[#F0D49B] bg-[#FFF7DF] px-3 py-2 text-xs text-[#8A6B2B]">
              เวลาว่างไม่พอจัดครบทุกเป้าหมาย คุณยังสามารถปรับตารางก่อนยอมรับได้
            </p>
          )}
          {error && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}
        </div>

        <footer className="relative z-20 shrink-0 flex items-center justify-end gap-2 border-t border-[#E9DDE1] bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isAccepting}
            className="rounded-xl border border-[#D8E1E5] px-4 py-2 text-sm text-[#61747D] hover:bg-[#F6FAFB] disabled:opacity-50"
          >
            ปิด
          </button>
          {recommendation.status === "pending" && (
            <button
              type="button"
              onClick={() => void handleAccept()}
              disabled={isAccepting}
              className="rounded-xl bg-[#71A982] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#609A72] disabled:opacity-50"
            >
              {isAccepting ? "กำลังยอมรับ..." : "ยอมรับคำแนะนำ"}
            </button>
          )}
        </footer>
      </section>

      {(selectedBlock || isAdding) && (
        <WeeklyBlockEditor
          block={selectedBlock}
          subjects={subjects}
          weekStart={recommendation.week_start}
          weekEnd={recommendation.week_end}
          isSaving={isSaving}
          isDeleting={isDeleting}
          onClose={() => {
            if (!isSaving && !isDeleting) {
              setSelectedBlock(null);
              setIsAdding(false);
            }
          }}
          onSave={handleSave}
          onDelete={selectedBlock ? handleDelete : undefined}
        />
      )}
    </div>,
    document.body
  );
}
