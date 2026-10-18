"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ClipboardCheck,
  LoaderCircle,
  Plus,
} from "lucide-react";
import type {
  CreateHomeworkInput,
  HomeworkSubject,
  HomeworkTask,
  HomeworkTypeOption,
  UpdateHomeworkInput,
} from "@/interfaces/homework.interface";
import homeworkService from "@/services/homework.service";
import CurrentTermRequiredState from "@/components/common/CurrentTermRequiredState";
import NotebookErrorState from "@/components/common/NotebookErrorState";
import AddHomeworkModal from "./AddHomeworkModal";
import HomeworkDetailsModal from "./HomeworkDetailsModal";
import {
  formatDisplayDate,
  formatDisplayTime,
  groupHomeworkTasks,
  sectionColors,
} from "./homeworkUtils";

export default function HomeworkDashboard({
  onHomeworkFinished,
  canAddHomework,
  canEditHomework = true,
  finalExamWindow = false,
}: {
  onHomeworkFinished: () => void;
  canAddHomework: boolean;
  canEditHomework?: boolean;
  finalExamWindow?: boolean;
}) {
  const [tasks, setTasks] = useState<HomeworkTask[]>([]);
  const [hasCurrentTerm, setHasCurrentTerm] = useState<boolean | null>(null);
  const [hasWorkloads, setHasWorkloads] = useState(false);
  const [subjects, setSubjects] = useState<HomeworkSubject[]>([]);
  const [types, setTypes] = useState<HomeworkTypeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<HomeworkTask | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const overview = await homeworkService.getHomeworkOverview();
      setTasks(overview.tasks);
      setHasCurrentTerm(overview.hasCurrentTerm);
      setHasWorkloads(overview.hasWorkloads);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "โหลดรายการงานไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    homeworkService
      .getHomeworkOverview()
      .then((overview) => {
        if (!active) return;
        setTasks(overview.tasks);
        setHasCurrentTerm(overview.hasCurrentTerm);
        setHasWorkloads(overview.hasWorkloads);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "โหลดรายการงานไม่สำเร็จ");
      })
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const groups = useMemo(() => groupHomeworkTasks(tasks), [tasks]);

  const openAdd = async () => {
    if (!hasCurrentTerm || !canAddHomework) return;
    setModalError(null);
    try {
      const [result, typeOptions] = await Promise.all([
        homeworkService.getSubjects(),
        homeworkService.getTypes(),
      ]);
      if (!result.length) throw new Error("ยังไม่มีรายวิชาในเทอมปัจจุบัน กรุณาสร้างตารางเรียนก่อน");
      if (!typeOptions.length) throw new Error("ยังไม่มีประเภทงานที่เปิดใช้งาน");
      setSubjects(result);
      setTypes(typeOptions);
      setIsAddOpen(true);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "โหลดรายวิชาไม่สำเร็จ");
    }
  };

  const createTask = async (input: CreateHomeworkInput) => {
    setIsAdding(true);
    setModalError(null);
    try {
      const created = await homeworkService.createHomework(input, subjects);
      setTasks((current) => [...current, created]);
      setHasWorkloads(true);
      setIsAddOpen(false);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "เพิ่มงานไม่สำเร็จ");
    } finally {
      setIsAdding(false);
    }
  };

  const updateTask = async (input: UpdateHomeworkInput) => {
    if (!selectedTask || !canEditHomework) return;
    setIsSaving(true);
    setModalError(null);
    try {
      const updated = await homeworkService.updateHomework(selectedTask, input);
      setTasks((current) =>
        current.map((task) => (task.workload_id === updated.workload_id ? updated : task))
      );
      setSelectedTask(null);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "แก้ไขงานไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTask = async () => {
    if (!selectedTask || !canEditHomework) return;
    setIsDeleting(true);
    setModalError(null);
    try {
      await homeworkService.deleteHomework(selectedTask.workload_id);
      setSelectedTask(null);
      await loadTasks();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "ลบงานไม่สำเร็จ");
    } finally {
      setIsDeleting(false);
    }
  };

  const finishTask = async (task: HomeworkTask) => {
    if (submittingId !== null || !canEditHomework) return;
    setSubmittingId(task.workload_id);
    setLoadError(null);
    try {
      await homeworkService.finishHomework(task.workload_id);
      setTasks((current) => current.filter((item) => item.workload_id !== task.workload_id));
      onHomeworkFinished();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "ส่งงานไม่สำเร็จ");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <section className="relative min-h-0 w-full md:h-full md:pl-1">
      <div className="px-2 pb-5 pt-1 md:h-full md:overflow-y-auto md:overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {!isLoading && !loadError && hasCurrentTerm && canAddHomework && (
          <button
            type="button"
            onClick={() => void openAdd()}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 border-[#E29DC7] bg-white px-4 text-sm font-medium text-[#D97FB5] shadow-sm transition hover:bg-[#E29DC7] hover:text-white"
          >
            <Plus className="h-4 w-4" /> เพิ่มงาน
          </button>
        )}
        {!canEditHomework && hasCurrentTerm && (
          <p className="mb-3 rounded-xl border border-[#D5E7EE] bg-[#F3FAFD] px-3 py-2 text-xs leading-5 text-[#698796]">
            {finalExamWindow
              ? "ช่วง 1 สัปดาห์ก่อนสอบและสัปดาห์สอบปลายภาค ไม่อนุญาตให้เพิ่มหรือแก้ไขภาระงาน และไม่สามารถกรอกคะแนนภาระงานได้"
              : "เข้าสู่ช่วงทบทวนก่อนสอบปลายภาครอบสุดท้ายแล้ว ขณะนี้ดูข้อมูลได้ แต่เพิ่ม/แก้ไขภาระงานและคะแนนไม่ได้"}
          </p>
        )}

        {isLoading ? (
          <HomeworkState>
            <LoaderCircle className="h-6 w-6 animate-spin text-[#D98AB7]" />
            <p>กำลังโหลดรายการงาน...</p>
          </HomeworkState>
        ) : loadError ? (
          <div className="flex min-h-[430px] items-center justify-center p-5 text-center">
            <NotebookErrorState
              detail={loadError}
              onRetry={() => void loadTasks()}
            />
          </div>
        ) : !hasCurrentTerm ? (
          <div className="flex min-h-[430px] items-center justify-center">
            <CurrentTermRequiredState detail="กรุณาสร้างเทอมและตารางเรียนก่อนเพิ่มงาน" />
          </div>
        ) : groups.length === 0 && hasWorkloads ? (
          <HomeworkState>
            <ClipboardCheck className="h-8 w-8 text-[#7FC29D]" />
            <p className="text-sm font-medium text-[#506F80]">ส่งงานครบแล้ว</p>
          </HomeworkState>
        ) : groups.length === 0 ? null : (
          <div className="mt-5 space-y-4">
            {groups.map((group) => {
              const colors = sectionColors[group.type];
              return (
                <div key={`${group.type}-${group.title}`}>
                  <div
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    }}
                    className="-ml-2 inline-flex min-h-7 min-w-[92px] items-center justify-center rounded-r-xl border px-3 text-xs font-medium text-black/80"
                  >
                    {group.title}
                  </div>
                  <div className="mt-3 space-y-3 pl-2">
                    {group.tasks.map((task) => (
                      <HomeworkTaskCard
                        key={task.workload_id}
                        task={task}
                        isSubmitting={submittingId === task.workload_id}
                        canEdit={canEditHomework}
                        onOpen={() => {
                          setModalError(null);
                          setSelectedTask(task);
                        }}
                        onSubmit={() => void finishTask(task)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isAddOpen && (
        <AddHomeworkModal
          types={types}
          subjects={subjects}
          isSaving={isAdding}
          serverError={modalError}
          onClose={() => !isAdding && setIsAddOpen(false)}
          onSave={(input) => void createTask(input)}
        />
      )}
      {selectedTask && (
        <HomeworkDetailsModal
          task={selectedTask}
          isSaving={isSaving}
          isDeleting={isDeleting}
          serverError={modalError}
          onClose={() => !isSaving && !isDeleting && setSelectedTask(null)}
          onSave={(input) => void updateTask(input)}
          onDelete={() => void deleteTask()}
          canEdit={canEditHomework}
        />
      )}
    </section>
  );
}

function HomeworkTaskCard({
  task,
  isSubmitting,
  onOpen,
  onSubmit,
  canEdit = true,
}: {
  task: HomeworkTask;
  isSubmitting: boolean;
  onOpen: () => void;
  onSubmit: () => void;
  canEdit?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen();
      }}
      className="grid min-h-[86px] w-full cursor-pointer grid-cols-[minmax(0,1fr)_72px_54px] items-center gap-2 rounded-2xl border border-black/20 bg-white px-3 py-3 text-[11px] text-[#374957] shadow-[1px_3px_7px_rgba(0,0,0,0.14)] transition hover:-translate-y-0.5 hover:shadow-md"
      aria-label={`ดูรายละเอียด ${task.workload_name}`}
    >
      <span className="min-w-0 leading-4">
        <span className="block truncate font-medium" title={task.subject_name}>{task.subject_name}</span>
        <span className="mt-1 block truncate text-[#70838D]" title={task.workload_name}>{task.workload_name}</span>
      </span>
      <span className="text-center text-[11px] leading-[15px]">
        <span className="block font-medium text-[#526975]">กำหนดส่ง</span>
        <span>{formatDisplayDate(task.deadline)}</span>
        <span className="block">{formatDisplayTime(task.deadline)}</span>
      </span>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSubmit();
        }}
        disabled={isSubmitting || !canEdit}
        className="flex h-9 items-center justify-center gap-1 rounded-xl border border-[#99B3C0] bg-[#CFEFFF] text-[11px] text-[#374957] disabled:opacity-60"
      >
        {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <><span>ส่ง</span><Check className="h-4 w-4" /></>}
      </button>
    </div>
  );
}

function HomeworkState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[190px] flex-col items-center justify-center gap-2 text-xs font-medium text-[#566F7D]">
      {children}
    </div>
  );
}
