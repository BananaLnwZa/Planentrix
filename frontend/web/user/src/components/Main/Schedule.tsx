"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type {
  AddScheduleRequest,
  ScheduleItem,
  ScheduleSubject,
  UpdateScheduleRequest,
} from "@/interfaces/table.interface";
import tableService from "@/services/table.service";
import AddSchedulePopup from "./AddSchedulePopup";
import ScheduleDetailsPopup from "./ScheduleDetailsPopup";
import ScheduleGrid from "./ScheduleGrid";

export default function Schedule() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
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

  useEffect(() => {
    let isActive = true;

    tableService
      .getCurrentSchedule()
      .then((response) => {
        if (!isActive) return;
        setItems(response?.data ?? []);
        setHasCurrentTerm(Boolean(response));
      })
      .catch((loadError: unknown) => {
        if (!isActive) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "ไม่สามารถโหลดตารางเวลาได้"
        );
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handleSelect = async (item: ScheduleItem) => {
    setIsLoadingDetail(true);
    setError("");
    try {
      setSelectedItem(await tableService.getScheduleDetail(item.schedule_time_id));
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
      const refreshedItem = await tableService.getScheduleDetail(
        selectedItem.schedule_time_id
      );
      setSelectedItem(refreshedItem);
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.schedule_time_id === refreshedItem.schedule_time_id
            ? refreshedItem
            : item
        )
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    setIsDeleting(true);
    try {
      await tableService.deleteSchedule(selectedItem.schedule_time_id);
      setItems((currentItems) =>
        currentItems.filter(
          (item) => item.schedule_time_id !== selectedItem.schedule_time_id
        )
      );
      setSelectedItem(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenAdd = async () => {
    if (!hasCurrentTerm) return;

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

      try {
        const response = await tableService.getCurrentSchedule();
        setItems(response?.data ?? []);
        setHasCurrentTerm(Boolean(response));
      } catch (reloadError) {
        setError(
          reloadError instanceof Error
            ? reloadError.message
            : "เพิ่มบล็อกแล้ว แต่ไม่สามารถโหลดตารางเวลาใหม่ได้"
        );
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <section className="flex h-[440px] min-h-0 w-full max-w-[440px] flex-col md:h-auto md:flex-1">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
        <h2
          className="text-base font-semibold text-[#52636D]"
          style={{ fontFamily: "var(--font-sansation)" }}
        >
          ตารางเวลาประจำสัปดาห์
        </h2>
        <div className="flex items-center gap-2 text-[10px] text-[#657780]">
          <Legend color="bg-[#DDF1C9]" label="เรียน" />
          <Legend color="bg-[#FFF0BA]" label="อ่านหนังสือ" />
          <Legend color="bg-[#F8D1CD]" label="การบ้าน" />
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <ScheduleGrid items={items} onSelect={handleSelect} />

        {(isLoading || isLoadingDetail) && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[14px] bg-white/65 text-sm text-[#6A8795] backdrop-blur-[1px]">
            {isLoading ? "กำลังโหลดตารางเวลา..." : "กำลังเปิดรายละเอียด..."}
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="pointer-events-none absolute inset-x-3 top-16 z-[5] rounded-xl border border-dashed border-[#B9D9E7] bg-white/90 px-4 py-3 text-center text-xs text-[#6A8795] shadow-sm">
            ยังไม่มีข้อมูลตารางเวลาสำหรับเทอมปัจจุบัน
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleOpenAdd()}
          disabled={isLoading || !hasCurrentTerm}
          aria-label="เพิ่มบล็อกเวลา"
          title={hasCurrentTerm ? "เพิ่มบล็อกเวลา" : "กรุณาสร้างเทอมก่อน"}
          className="absolute bottom-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-xl border-2 border-white bg-[#F58BC2] text-white shadow-[0_5px_12px_rgba(190,83,140,0.3)] transition hover:-translate-y-0.5 hover:bg-[#EC78B3] hover:shadow-[0_7px_15px_rgba(190,83,140,0.36)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D865A2] disabled:cursor-not-allowed disabled:bg-[#C9D4D9] disabled:shadow-none"
        >
          <Plus aria-hidden="true" size={27} strokeWidth={3.2} />
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600"
        >
          {error}
        </p>
      )}

      {selectedItem && (
        <ScheduleDetailsPopup
          key={`${selectedItem.schedule_time_id}-${selectedItem.schedule_day}-${selectedItem.start_time}-${selectedItem.end_time}-${selectedItem.classroom}-${selectedItem.note}`}
          item={selectedItem}
          isSaving={isSaving}
          isDeleting={isDeleting}
          onClose={() => setSelectedItem(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      {isAddOpen && (
        <AddSchedulePopup
          subjects={subjects}
          scheduleItems={items}
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
