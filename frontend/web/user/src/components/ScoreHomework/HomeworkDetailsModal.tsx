"use client";

import { useState } from "react";
import { Check, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import type {
  HomeworkTask,
  UpdateHomeworkInput,
} from "@/interfaces/homework.interface";
import {
  formatDisplayDate,
  formatDisplayTime,
  getWorkloadPalette,
  toDateTimeLocalValue,
} from "./homeworkUtils";
import LocalizedDateTimeInput from "@/components/common/LocalizedDateTimeInput";

export default function HomeworkDetailsModal({
  task,
  isSaving,
  isDeleting,
  serverError,
  onClose,
  onSave,
  onDelete,
}: {
  task: HomeworkTask;
  isSaving: boolean;
  isDeleting: boolean;
  serverError: string | null;
  onClose: () => void;
  onSave: (input: UpdateHomeworkInput) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(task.workload_name);
  const [deadline, setDeadline] = useState(toDateTimeLocalValue(task.deadline));
  const [note, setNote] = useState(task.note);
  const [validation, setValidation] = useState<string | null>(null);
  const palette = getWorkloadPalette(task.workload_type_name);

  const submit = () => {
    const parsedDeadline = new Date(deadline);
    if (!name.trim()) {
      setValidation("กรุณากรอกชื่องาน");
      return;
    }
    if (!deadline || Number.isNaN(parsedDeadline.getTime())) {
      setValidation("กรุณากรอกกำหนดส่งให้ถูกต้อง");
      return;
    }
    onSave({ workload_name: name.trim(), deadline: parsedDeadline, note: note.trim() });
  };

  const busy = isSaving || isDeleting;
  return (
    <div className="absolute inset-0 z-[130] flex items-center justify-center rounded-[22px] bg-transparent p-2 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="homework-details-title"
        className="w-full max-w-[370px] rounded-[20px] border border-[#D2C7CB] bg-white p-5 shadow-[0_18px_45px_rgba(86,58,70,0.22)]"
      >
        <div className="flex items-center justify-between">
          <h2 id="homework-details-title" className="text-lg font-semibold text-[#3D505A]">
            รายละเอียดงาน
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="ปิด"
            className="rounded-full p-1.5 text-[#E06D91] hover:bg-[#FFF0F5]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <DetailsRow label="วิชา">
            <ReadField text={`${task.subject_id} ${task.subject_name}`} />
          </DetailsRow>
          <DetailsRow label="ประเภท">
            <span
              style={{ backgroundColor: palette.normal }}
              className="inline-flex rounded-full border border-black/20 px-3 py-1 text-xs text-black/60"
            >
              {task.workload_type_name}
            </span>
          </DetailsRow>
          <DetailsRow label="ชื่องาน">
            {isEditing ? (
              <EditInput value={name} onChange={setName} />
            ) : (
              <ReadField text={task.workload_name} />
            )}
          </DetailsRow>
          <DetailsRow label="กำหนดส่ง">
            {isEditing ? (
              <LocalizedDateTimeInput
                type="datetime-local"
                step={60}
                value={deadline}
                onChange={(event) => {
                  setDeadline(event.target.value);
                  setValidation(null);
                }}
                aria-label="กำหนดส่ง"
                className="h-9 w-full rounded-full border border-[#AEB9BE] bg-white px-4 text-xs font-medium text-[#374957] outline-none focus-within:border-[#5EACD1]"
              />
            ) : (
              <ReadField
                text={`${formatDisplayDate(task.deadline)} ${formatDisplayTime(task.deadline)}`}
              />
            )}
          </DetailsRow>
          <DetailsRow label="โน้ต">
            {isEditing ? (
              <EditInput value={note} onChange={setNote} placeholder="รายละเอียดงาน" />
            ) : (
              <ReadField text={task.note.trim() || "ไม่มีรายละเอียดงาน"} muted={!task.note.trim()} />
            )}
          </DetailsRow>
        </div>

        {(validation || serverError) && (
          <p className="mt-4 rounded-xl bg-[#FFF0F4] px-3 py-2 text-center text-xs text-[#C85E7A]">
            {validation || serverError}
          </p>
        )}

        {isEditing ? (
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="mx-auto mt-5 flex min-h-10 min-w-[120px] items-center justify-center gap-2 rounded-full border border-[#9BCB82] bg-[#E1F6D1] px-5 text-sm font-medium text-[#4F7041] disabled:opacity-60"
          >
            {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {isSaving ? "กำลังบันทึก" : "บันทึก"}
          </button>
        ) : (
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="flex min-h-9 min-w-[96px] items-center justify-center gap-1.5 rounded-full border border-[#EFA2B5] bg-[#FFF0F4] px-4 text-sm text-[#C85E7A] disabled:opacity-60"
            >
              {isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {isDeleting ? "กำลังลบ" : "ลบ"}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={busy}
              className="flex min-h-9 min-w-[96px] items-center justify-center gap-1.5 rounded-full border border-[#E2C667] bg-[#FFF4C7] px-4 text-sm text-[#7C682C] disabled:opacity-60"
            >
              <Pencil className="h-4 w-4" /> แก้ไข
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[76px_1fr] items-center gap-2">
      <span className="text-sm text-[#333]">{label} :</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ReadField({ text, muted = false }: { text: string; muted?: boolean }) {
  return (
    <div
      className={`h-8 truncate rounded-full border border-[#CBCBCB] bg-white px-3 py-1.5 text-xs ${
        muted ? "font-medium text-[#76858D]" : "font-medium text-[#4A555B]"
      }`}
      title={text}
    >
      {text}
    </div>
  );
}

function EditInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      maxLength={500}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 w-full rounded-full border border-[#AEB9BE] bg-[#FFFEFA] px-3 text-xs font-medium text-[#374957] opacity-100 outline-none placeholder:font-medium placeholder:text-[#657983] placeholder:opacity-100 focus:border-[#5EACD1]"
    />
  );
}
