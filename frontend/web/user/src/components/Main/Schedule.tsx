"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type {
  WeeklyBlockInput,
  WeeklyRecommendation,
  WeeklyScheduleBlock,
} from "@/interfaces/recommendation.interface";
import type {
  AddScheduleRequest,
  DisplayScheduleItem,
  ScheduleItem,
  ScheduleSubject,
  UpdateScheduleRequest,
} from "@/interfaces/table.interface";
import recommendationService from "@/services/recommendation.service";
import tableService from "@/services/table.service";
import AddSchedulePopup from "./AddSchedulePopup";
import ScheduleDetailsPopup from "./ScheduleDetailsPopup";
import ScheduleGrid from "./ScheduleGrid";
import WeeklyBlockEditor from "./WeeklyBlockEditor";

type ScheduleProps = { refreshKey?: number };

const isoDay = (value: string) => {
  const day = new Date(`${value}T00:00:00`).getDay();
  return day === 0 ? 7 : day;
};

const recurringDisplayItem = (
  item: Omit<ScheduleItem, "teacher_name" | "credits"> & {
    teacher_name?: string;
    credits?: number;
  }
): DisplayScheduleItem => ({
  ...item,
  display_id: `recurring-${item.schedule_time_id}`,
  source: "recurring",
  weekly_block_id: null,
  recommendation_id: null,
  scheduled_date: null,
  is_user_modified: false,
  teacher_name: item.teacher_name ?? "",
  credits: item.credits ?? 0,
  start_time: item.start_time.slice(0, 5),
  end_time: item.end_time.slice(0, 5),
});

const weeklyDisplayItem = (block: WeeklyScheduleBlock): DisplayScheduleItem => ({
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

export default function Schedule({ refreshKey = 0 }: ScheduleProps) {
  const [items, setItems] = useState<DisplayScheduleItem[]>([]);
  const [legacyItems, setLegacyItems] = useState<ScheduleItem[]>([]);
  const [weeklyBlocks, setWeeklyBlocks] = useState<WeeklyScheduleBlock[]>([]);
  const [acceptedRecommendation, setAcceptedRecommendation] =
    useState<WeeklyRecommendation | null>(null);
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
  const [selectedWeeklyBlock, setSelectedWeeklyBlock] =
    useState<WeeklyScheduleBlock | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [hasCurrentTerm, setHasCurrentTerm] = useState(false);
  const [subjects, setSubjects] = useState<ScheduleSubject[]>([]);
  const [subjectsError, setSubjectsError] = useState("");
  const [error, setError] = useState("");

  const loadSchedule = useCallback(async () => {
    const [legacyResult, weeklyResult] = await Promise.allSettled([
      tableService.getCurrentSchedule(),
      recommendationService.getWeeklySchedule(),
    ]);

    const legacy =
      legacyResult.status === "fulfilled" ? legacyResult.value : null;
    setLegacyItems(legacy?.data ?? []);
    setHasCurrentTerm(Boolean(legacy));

    if (
      weeklyResult.status === "fulfilled" &&
      weeklyResult.value.accepted_recommendation
    ) {
      const weekly = weeklyResult.value;
      setAcceptedRecommendation(weekly.accepted_recommendation);
      setWeeklyBlocks(weekly.weekly_blocks);
      setItems([
        ...weekly.recurring_classes.map((item) =>
          recurringDisplayItem({ ...item, teacher_name: "", credits: 0 })
        ),
        ...weekly.weekly_blocks.map(weeklyDisplayItem),
      ]);
      setHasCurrentTerm(true);
    } else {
      setAcceptedRecommendation(null);
      setWeeklyBlocks([]);
      setItems((legacy?.data ?? []).map(recurringDisplayItem));
    }

    if (legacyResult.status === "rejected" && weeklyResult.status === "rejected") {
      const reason = legacyResult.reason;
      setError(
        reason instanceof Error ? reason.message : "ไม่สามารถโหลดตารางเวลาได้"
      );
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSchedule();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSchedule, refreshKey]);

  const handleSelect = async (item: DisplayScheduleItem) => {
    setError("");
    if (item.source === "weekly") {
      setSelectedWeeklyBlock(
        weeklyBlocks.find(
          (block) => block.weekly_block_id === item.weekly_block_id
        ) ?? null
      );
      return;
    }
    if (!item.schedule_time_id) return;
    setIsLoadingDetail(true);
    try {
      setSelectedItem(
        await tableService.getScheduleDetail(item.schedule_time_id)
      );
    } catch (detailError) {
      setError(
        detailError instanceof Error
          ? detailError.message
          : "ไม่สามารถโหลดรายละเอียดได้"
      );
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleSave = async (data: UpdateScheduleRequest) => {
    if (!selectedItem) return;
    setIsSaving(true);
    try {
      await tableService.updateSchedule(selectedItem.schedule_time_id, data);
      setSelectedItem(
        await tableService.getScheduleDetail(selectedItem.schedule_time_id)
      );
      await loadSchedule();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    setIsDeleting(true);
    try {
      await tableService.deleteSchedule(selectedItem.schedule_time_id);
      setSelectedItem(null);
      await loadSchedule();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleWeeklySave = async (input: WeeklyBlockInput) => {
    if (!selectedWeeklyBlock || !acceptedRecommendation) return;
    setIsSaving(true);
    try {
      await recommendationService.updateBlock(
        acceptedRecommendation.recommendation_id,
        selectedWeeklyBlock.weekly_block_id,
        {
          scheduled_date: input.scheduled_date,
          start_time: input.start_time,
          end_time: input.end_time,
        }
      );
      setSelectedWeeklyBlock(null);
      await loadSchedule();
    } finally {
      setIsSaving(false);
    }
  };

  const handleWeeklyDelete = async () => {
    if (!selectedWeeklyBlock || !acceptedRecommendation) return;
    setIsDeleting(true);
    try {
      await recommendationService.deleteBlock(
        acceptedRecommendation.recommendation_id,
        selectedWeeklyBlock.weekly_block_id
      );
      setSelectedWeeklyBlock(null);
      await loadSchedule();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenAdd = async () => {
    if (!hasCurrentTerm || acceptedRecommendation) return;
    setIsAddOpen(true);
    setIsLoadingSubjects(true);
    setSubjectsError("");
    try {
      const response = await tableService.getCurrentTermSubjects();
      setSubjects(response.data);
    } catch (loadSubjectsError) {
      setSubjects([]);
      setSubjectsError(
        loadSubjectsError instanceof Error
          ? loadSubjectsError.message
          : "ไม่สามารถโหลดรายวิชาได้"
      );
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const handleAdd = async (data: AddScheduleRequest) => {
    setIsAdding(true);
    try {
      await tableService.addSchedule(data);
      setIsAddOpen(false);
      await loadSchedule();
    } finally {
      setIsAdding(false);
    }
  };

  const hasScheduleItems = items.length > 0;

  return (
    <section
      className={`flex min-h-0 w-full max-w-[440px] flex-col ${
        hasScheduleItems || isLoading
          ? "h-[440px] md:h-auto md:flex-1"
          : "h-[150px]"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
        <div>
          <h2 className="text-base font-semibold text-[#52636D]" style={{ fontFamily: "var(--font-sansation)" }}>
            ตารางเวลาประจำสัปดาห์
          </h2>
          {acceptedRecommendation && (
            <p className="text-[9px] text-[#71907A]">
              กำลังใช้แผนวันที่ {acceptedRecommendation.week_start} – {acceptedRecommendation.week_end}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#657780]">
          <Legend color="bg-[#DDF1C9]" label="เรียน" />
          <Legend color="bg-[#FFF0BA]" label="อ่านหนังสือ" />
          <Legend color="bg-[#F8D1CD]" label="การบ้าน" />
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {hasScheduleItems && <ScheduleGrid items={items} onSelect={handleSelect} />}
        {(isLoading || isLoadingDetail) && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[14px] bg-white/65 text-sm text-[#6A8795] backdrop-blur-[1px]">
            {isLoading ? "กำลังโหลดตารางเวลา..." : "กำลังเปิดรายละเอียด..."}
          </div>
        )}
        {!isLoading && !error && items.length === 0 && (
          <div className="pointer-events-none absolute inset-x-3 top-3 z-[5] rounded-xl border border-dashed border-[#B9D9E7] bg-white/90 px-4 py-3 text-center text-xs text-[#6A8795] shadow-sm">
            ยังไม่มีข้อมูลตารางเวลาสำหรับเทอมปัจจุบัน
          </div>
        )}
        {hasScheduleItems && !acceptedRecommendation && (
          <button
            type="button"
            onClick={() => void handleOpenAdd()}
            disabled={isLoading || !hasCurrentTerm}
            aria-label="เพิ่มบล็อกเวลา"
            title={hasCurrentTerm ? "เพิ่มบล็อกเวลา" : "กรุณาสร้างเทอมก่อน"}
            className="absolute bottom-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-xl border-2 border-white bg-[#F58BC2] text-white shadow-[0_5px_12px_rgba(190,83,140,0.3)] transition hover:-translate-y-0.5 hover:bg-[#EC78B3] disabled:opacity-50"
          >
            <Plus aria-hidden="true" size={27} strokeWidth={3.2} />
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}
      {selectedItem && (
        <ScheduleDetailsPopup
          key={`${selectedItem.schedule_time_id}-${selectedItem.schedule_day}-${selectedItem.start_time}-${selectedItem.end_time}`}
          item={selectedItem}
          isSaving={isSaving}
          isDeleting={isDeleting}
          onClose={() => setSelectedItem(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
      {selectedWeeklyBlock && acceptedRecommendation && (
        <WeeklyBlockEditor
          block={selectedWeeklyBlock}
          subjects={[]}
          weekStart={acceptedRecommendation.week_start}
          weekEnd={acceptedRecommendation.week_end}
          isSaving={isSaving}
          isDeleting={isDeleting}
          onClose={() => setSelectedWeeklyBlock(null)}
          onSave={handleWeeklySave}
          onDelete={handleWeeklyDelete}
        />
      )}
      {isAddOpen && (
        <AddSchedulePopup
          subjects={subjects}
          scheduleItems={legacyItems}
          isLoadingSubjects={isLoadingSubjects}
          subjectsError={subjectsError}
          isSubmitting={isAdding}
          onClose={() => {
            if (!isAdding) setIsAddOpen(false);
          }}
          onSubmit={handleAdd}
        />
      )}
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className={`h-2.5 w-2.5 rounded-sm border border-black/10 ${color}`} />
      {label}
    </span>
  );
}
