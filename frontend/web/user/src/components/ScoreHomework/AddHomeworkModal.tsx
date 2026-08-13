"use client";

import { useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import {
  HOMEWORK_TYPE_OPTIONS,
  type CreateHomeworkInput,
  type HomeworkSubject,
} from "@/interfaces/homework.interface";
import { getWorkloadPalette } from "./homeworkUtils";
import LocalizedDateTimeInput from "@/components/common/LocalizedDateTimeInput";

export default function AddHomeworkModal({
  subjects,
  isSaving,
  serverError,
  onClose,
  onSave,
}: {
  subjects: HomeworkSubject[];
  isSaving: boolean;
  serverError: string | null;
  onClose: () => void;
  onSave: (input: CreateHomeworkInput) => void;
}) {
  const [subjectId, setSubjectId] = useState("");
  const [typeId, setTypeId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [validation, setValidation] = useState<string | null>(null);

  const submit = () => {
    const parsedDeadline = new Date(deadline);
    if (
      !subjectId ||
      typeId === null ||
      !name.trim() ||
      !deadline ||
      Number.isNaN(parsedDeadline.getTime())
    ) {
      setValidation("กรุณากรอกวิชา ประเภท ชื่องาน และกำหนดส่งให้ครบ");
      return;
    }
    onSave({
      schedule_time_id: Number(subjectId),
      workload_type_id: typeId,
      workload_name: name.trim(),
      deadline: parsedDeadline,
      note: note.trim(),
    });
  };

  return (
    <div className="absolute inset-0 z-[130] flex items-center justify-center rounded-[22px] bg-transparent p-2 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-homework-title"
        className="max-h-full w-full max-w-[430px] overflow-y-auto rounded-[22px] border border-[#D8CDD1] bg-white p-5 shadow-[0_18px_45px_rgba(86,58,70,0.22)]"
      >
        <div className="flex items-center justify-between">
          <h2 id="add-homework-title" className="text-lg font-semibold text-[#3D505A]">
            เพิ่มงาน
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="ปิด"
            className="rounded-full p-1.5 text-[#E06D91] hover:bg-[#FFF0F5]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3.5">
          <LabeledField label="วิชา">
            <select
              value={subjectId}
              onChange={(event) => {
                setSubjectId(event.target.value);
                setValidation(null);
              }}
              className="h-10 w-full rounded-full border border-[#AEB9BE] bg-white px-3 text-sm font-medium text-[#374957] opacity-100 outline-none focus:border-[#5EACD1]"
            >
              <option value="">เลือกวิชา</option>
              {subjects.map((subject) => (
                <option key={subject.schedule_time_id} value={subject.schedule_time_id}>
                  {subject.subject_id} {subject.subject_name}
                </option>
              ))}
            </select>
          </LabeledField>

          <LabeledField label="ประเภท" alignStart>
            <div className="flex flex-wrap gap-1.5">
              {HOMEWORK_TYPE_OPTIONS.map((option) => {
                const palette = getWorkloadPalette(option.name);
                const selected = option.id === typeId;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setTypeId(option.id);
                      setValidation(null);
                    }}
                    style={{ backgroundColor: selected ? palette.hover : palette.normal }}
                    className={`min-w-[70px] rounded-full border px-2.5 py-1.5 text-xs text-black/60 transition ${
                      selected
                        ? "border-[#527383] shadow-sm"
                        : "border-black/25 hover:-translate-y-0.5"
                    }`}
                  >
                    {option.name}
                  </button>
                );
              })}
            </div>
          </LabeledField>

          <LabeledField label="ชื่องาน">
            <input
              value={name}
              maxLength={255}
              onChange={(event) => {
                setName(event.target.value);
                setValidation(null);
              }}
              placeholder="ชื่องาน"
              className="h-10 w-full rounded-full border border-[#AEB9BE] bg-white px-4 text-sm font-medium text-[#374957] opacity-100 outline-none placeholder:font-medium placeholder:text-[#657983] placeholder:opacity-100 focus:border-[#5EACD1]"
            />
          </LabeledField>
          <LabeledField label="กำหนดส่ง">
            <LocalizedDateTimeInput
              type="datetime-local"
              step={60}
              value={deadline}
              onChange={(event) => {
                setDeadline(event.target.value);
                setValidation(null);
              }}
              aria-label="กำหนดส่ง"
              className="h-10 w-full rounded-full border border-[#AEB9BE] bg-white px-4 text-sm font-medium text-[#374957] outline-none focus-within:border-[#5EACD1]"
            />
          </LabeledField>
          <LabeledField label="โน้ต">
            <input
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              placeholder="รายละเอียดงาน"
              className="h-10 w-full rounded-full border border-[#AEB9BE] bg-white px-4 text-sm font-medium text-[#374957] opacity-100 outline-none placeholder:font-medium placeholder:text-[#657983] placeholder:opacity-100 focus:border-[#5EACD1]"
            />
          </LabeledField>
        </div>

        {(validation || serverError) && (
          <p className="mt-4 rounded-xl bg-[#FFF0F4] px-3 py-2 text-center text-xs text-[#C85272]">
            {validation || serverError}
          </p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={isSaving}
          aria-label="บันทึกงาน"
          className="mx-auto mt-5 flex h-10 w-20 items-center justify-center rounded-xl border border-[#9EC584] bg-[#CFF2B4] text-[#31543A] hover:bg-[#BFE8A2] disabled:opacity-60"
        >
          {isSaving ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <Check className="h-6 w-6" />
          )}
        </button>
      </div>
    </div>
  );
}

function LabeledField({
  label,
  alignStart = false,
  children,
}: {
  label: string;
  alignStart?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid grid-cols-[74px_1fr] gap-2 ${alignStart ? "items-start" : "items-center"}`}>
      <span className={`text-sm text-[#333] ${alignStart ? "pt-1.5" : ""}`}>{label} :</span>
      <div>{children}</div>
    </div>
  );
}
