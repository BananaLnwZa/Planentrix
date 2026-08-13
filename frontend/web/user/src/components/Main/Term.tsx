"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronsUpDown, Plus, X } from "lucide-react";
import type { CurrentTerm } from "@/interfaces/term.interface";
import termService from "@/services/term.service";
import TermDetailsPopup from "@/components/Main/TermDetailsPopup";
import LocalizedDateTimeInput from "@/components/common/LocalizedDateTimeInput";
import { formatDisplayDate } from "@/utils/dateTime";

export type TermFormValues = {
  academicYear: string;
  semester: string;
  term: string;
  midtermStartDate: string;
  midtermEndDate: string;
  finalStartDate: string;
  finalEndDate: string;
};

const emptyTermFormValues: TermFormValues = {
  academicYear: "",
  semester: "",
  term: "",
  midtermStartDate: "",
  midtermEndDate: "",
  finalStartDate: "",
  finalEndDate: "",
};

type TermProps = {
  onAddTerm?: () => void;
  onConfirm?: (values: TermFormValues) => void;
  onEndTerm?: () => void;
};

const selectClassName = `
  h-10
  w-full
  appearance-none
  rounded-full
  border
  border-[#C8C8C8]
  bg-white
  px-4
  pr-9
  text-sm
  text-[#555555]
  outline-none
  transition-colors
  focus:border-[#F080A7]
`;

function getNextDate(date: string) {
  if (!date) return undefined;

  const [year, month, day] = date.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  return nextDate.toISOString().slice(0, 10);
}

function getTermValidationError(values: TermFormValues) {
  if (values.semester && !/^\d{4}$/.test(values.semester)) {
    return "ปีการศึกษาต้องเป็นตัวเลข 4 หลัก";
  }

  if (
    values.midtermStartDate &&
    values.midtermEndDate &&
    values.midtermEndDate <= values.midtermStartDate
  ) {
    return "วันสิ้นสุดสอบกลางภาคต้องอยู่หลังวันเริ่มต้น";
  }

  if (
    values.midtermEndDate &&
    values.finalStartDate &&
    values.finalStartDate <= values.midtermEndDate
  ) {
    return "วันเริ่มสอบปลายภาคต้องอยู่หลังวันสิ้นสุดสอบกลางภาค";
  }

  if (
    values.finalStartDate &&
    values.finalEndDate &&
    values.finalEndDate <= values.finalStartDate
  ) {
    return "วันสิ้นสุดสอบปลายภาคต้องอยู่หลังวันเริ่มต้น";
  }

  return "";
}

function formatThaiExamDate(date?: string | null) {
  return formatDisplayDate(date);
}

function SelectField({
  id,
  name,
  placeholder,
  value,
  onChange,
  children,
}: {
  id: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full">
      <select
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className={selectClassName}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {children}
      </select>
      <ChevronsUpDown
        aria-hidden="true"
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8B8B]"
      />
    </div>
  );
}

function ExamWeekField({
  label,
  idPrefix,
  startName,
  endName,
  startDate,
  endDate,
  startMin,
  onStartDateChange,
  onEndDateChange,
}: {
  label: string;
  idPrefix: string;
  startName: string;
  endName: string;
  startDate: string;
  endDate: string;
  startMin?: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2">
      <label
        htmlFor={`${idPrefix}-start-date`}
        className="whitespace-nowrap text-[15px] text-[#4F6875]"
      >
        {label}
      </label>
      <div className="flex min-w-0 items-center gap-2">
        <LocalizedDateTimeInput
          id={`${idPrefix}-start-date`}
          name={startName}
          type="date"
          required
          min={startMin}
          value={startDate}
          onChange={(event) => onStartDateChange(event.target.value)}
          aria-label={`วันเริ่ม${label}`}
          className="h-10 min-w-0 flex-1 rounded-full border border-[#C8C8C8] bg-white px-3 text-xs text-[#4F6875] outline-none transition-colors focus-within:border-[#F080A7]"
        />
        <span aria-hidden="true" className="text-lg text-[#8AA6B3]">
          –
        </span>
        <LocalizedDateTimeInput
          id={`${idPrefix}-end-date`}
          name={endName}
          type="date"
          required
          min={getNextDate(startDate)}
          value={endDate}
          onChange={(event) => onEndDateChange(event.target.value)}
          aria-label={`วันสิ้นสุด${label}`}
          className="h-10 min-w-0 flex-1 rounded-full border border-[#C8C8C8] bg-white px-3 text-xs text-[#4F6875] outline-none transition-colors focus-within:border-[#F080A7]"
        />
      </div>
    </div>
  );
}

export default function Term({ onAddTerm, onConfirm, onEndTerm }: TermProps) {
  const termCardRef = useRef<HTMLElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [termFormValues, setTermFormValues] = useState<TermFormValues>(
    emptyTermFormValues
  );
  const [formError, setFormError] = useState("");
  const [currentTerm, setCurrentTerm] = useState<CurrentTerm | null>(null);
  const [isLoadingTerm, setIsLoadingTerm] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEndingTerm, setIsEndingTerm] = useState(false);
  const [dialogPosition, setDialogPosition] = useState({
    left: 16,
    top: 16,
    width: 440,
  });

  const isFormComplete = Object.values(termFormValues).every(Boolean);
  const validationError = getTermValidationError(termFormValues);
  const canSubmit = isFormComplete && !validationError && !isSubmitting;

  const updateTermFormValue = (
    field: keyof TermFormValues,
    value: string
  ) => {
    setTermFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
    setFormError("");
  };

  useEffect(() => {
    let isActive = true;

    termService
      .getCurrentTerm()
      .then((term) => {
        if (isActive) setCurrentTerm(term);
      })
      .catch((error) => {
        if (isActive) {
          setFormError(
            error instanceof Error ? error.message : "Unable to load current term"
          );
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingTerm(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen && !isDetailsOpen) return;

    const previousOverflow = document.body.style.overflow;
    const updateDialogPosition = () => {
      const card = termCardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const pagePadding = 16;
      const width = Math.min(rect.width, window.innerWidth - pagePadding * 2);

      setDialogPosition({
        left: Math.max(
          pagePadding,
          Math.min(rect.left, window.innerWidth - width - pagePadding)
        ),
        top: Math.max(pagePadding, rect.top),
        width,
      });
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsDetailsOpen(false);
      }
    };

    updateDialogPosition();
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateDialogPosition);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateDialogPosition);
    };
  }, [isOpen, isDetailsOpen]);

  const openTermForm = () => {
    setFormError("");
    setIsOpen(true);
    onAddTerm?.();
  };

  const openTermDetails = () => {
    setFormError("");
    setIsDetailsOpen(true);
  };

  const handleEndTerm = async () => {
    setFormError("");
    setIsEndingTerm(true);

    try {
      await termService.endCurrentTerm();
      setCurrentTerm(null);
      setTermFormValues(emptyTermFormValues);
      setIsDetailsOpen(false);
      onEndTerm?.();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to end current term"
      );
    } finally {
      setIsEndingTerm(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const values = termFormValues;
    setFormError("");
    setIsSubmitting(true);

    try {
      const response = await termService.createTerm({
        academic_year: Number(values.academicYear),
        semester: values.semester,
        term: Number(values.term),
        start_midterm: values.midtermStartDate,
        end_midterm: values.midtermEndDate,
        start_final: values.finalStartDate,
        end_final: values.finalEndDate,
      });

      setCurrentTerm({
        term_id: response.term_id,
        user_id: response.user_id,
        term: Number(values.term),
        academic_year: Number(values.academicYear),
        semester: values.semester,
        start_midterm: values.midtermStartDate,
        end_midterm: values.midtermEndDate,
        start_final: values.finalStartDate,
        end_final: values.finalEndDate,
        term_status: 1,
      });
      onConfirm?.(values);
      setTermFormValues(emptyTermFormValues);
      setIsOpen(false);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to create term"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <section
        ref={termCardRef}
        aria-labelledby="term-empty-title"
        className={`flex min-h-[98px] w-full max-w-[440px] flex-col items-center justify-center rounded-xl border border-[#AFAFAF] bg-white shadow-[0_5px_9px_rgba(75,93,102,0.22)] ${currentTerm ? "p-0" : "px-4 py-2.5"}`}
      >
        {isLoadingTerm ? (
          <p className="text-center text-sm text-[#7897AC]">
            กำลังโหลดข้อมูลเทอม...
          </p>
        ) : currentTerm ? (
          <button
            type="button"
            onClick={openTermDetails}
            aria-haspopup="dialog"
            className="group min-h-[132px] w-full rounded-[11px] px-4 py-2 text-left text-[#242424] transition-all duration-200 hover:bg-[#B9DFF0] hover:text-white hover:shadow-[0_7px_11px_rgba(75,93,102,0.26)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9CC5F9]"
            style={{ fontFamily: "var(--font-sansation)" }}
          >
            <span id="term-empty-title" className="sr-only">
              ข้อมูลเทอมปัจจุบัน
            </span>

            <div className="grid grid-cols-[auto_auto_auto] items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 whitespace-nowrap text-[clamp(12px,2vw,14px)]">
                <span>ชั้นปีที่</span>
                <span className="flex h-8 min-w-[48px] items-center justify-center rounded-full border border-[#C8C8C8] bg-white px-2.5 text-[clamp(15px,2.2vw,17px)] leading-none text-[#242424] transition-colors duration-200 group-hover:text-[#82B5CF]">
                  {currentTerm.academic_year}
                </span>
              </div>

              <div className="flex items-center gap-1.5 whitespace-nowrap text-[clamp(12px,2vw,14px)]">
                <span>ปีการศึกษา</span>
                <span className="flex h-8 min-w-[74px] items-center justify-center rounded-full border border-[#C8C8C8] bg-white px-2.5 text-[clamp(15px,2.2vw,17px)] leading-none text-[#242424] transition-colors duration-200 group-hover:text-[#82B5CF]">
                  {currentTerm.semester}
                </span>
              </div>

              <div className="flex items-center gap-1.5 whitespace-nowrap text-[clamp(12px,2vw,14px)]">
                <span>เทอม</span>
                <span className="flex h-8 min-w-[48px] items-center justify-center rounded-full border border-[#C8C8C8] bg-white px-2.5 text-[clamp(15px,2.2vw,17px)] leading-none text-[#242424] transition-colors duration-200 group-hover:text-[#82B5CF]">
                  {currentTerm.term}
                </span>
              </div>
            </div>

            <div className="mt-2 space-y-1.5 rounded-xl bg-[#F6FBFD] px-2.5 py-1.5 text-[clamp(11px,2vw,13px)] transition-colors duration-200 group-hover:bg-white/25">
              <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                <span className="whitespace-nowrap text-[#688492] transition-colors group-hover:text-white">
                  สอบกลางภาค
                </span>
                <span className="flex h-7 min-w-0 items-center justify-center whitespace-nowrap rounded-full border border-[#C8C8C8] bg-white px-2 text-[clamp(11px,2.1vw,13px)] text-[#242424] transition-colors duration-200 group-hover:text-[#82B5CF]">
                  {formatThaiExamDate(currentTerm.start_midterm)} –{" "}
                  {formatThaiExamDate(currentTerm.end_midterm)}
                </span>
              </div>
              <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                <span className="whitespace-nowrap text-[#688492] transition-colors group-hover:text-white">
                  สอบปลายภาค
                </span>
                <span className="flex h-7 min-w-0 items-center justify-center whitespace-nowrap rounded-full border border-[#C8C8C8] bg-white px-2 text-[clamp(11px,2.1vw,13px)] text-[#242424] transition-colors duration-200 group-hover:text-[#82B5CF]">
                  {formatThaiExamDate(currentTerm.start_final)} –{" "}
                  {formatThaiExamDate(currentTerm.end_final)}
                </span>
              </div>
            </div>
          </button>
        ) : (
          <>
            <h2
              id="term-empty-title"
              className="text-center text-[18px] leading-none text-[#9CC5F9]"
              style={{ fontFamily: "var(--font-Sansation Light)" }}
            >
              *กรุณาระบุข้อมูลเทอมก่อนใช้งาน*
            </h2>

            <button
              type="button"
              onClick={openTermForm}
              aria-label="เพิ่มข้อมูลเทอม"
              aria-haspopup="dialog"
              className="mt-2.5 flex h-10 w-[92px] items-center justify-center rounded-full bg-[#A9DDFC] text-white transition-all duration-200 hover:scale-105 hover:bg-[#96D3F7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9CC5F9] active:scale-95"
            >
              <Plus aria-hidden="true" size={27} strokeWidth={3.5} />
            </button>

            {formError && (
              <p role="alert" className="mt-2 text-center text-xs text-red-500">
                {formError}
              </p>
            )}
          </>
        )}
      </section>

      {isDetailsOpen && currentTerm && (
        <TermDetailsPopup
          term={currentTerm}
          midtermStartLabel={formatThaiExamDate(currentTerm.start_midterm)}
          midtermEndLabel={formatThaiExamDate(currentTerm.end_midterm)}
          finalStartLabel={formatThaiExamDate(currentTerm.start_final)}
          finalEndLabel={formatThaiExamDate(currentTerm.end_final)}
          position={dialogPosition}
          error={formError}
          isEnding={isEndingTerm}
          onClose={() => setIsDetailsOpen(false)}
          onEndTerm={handleEndTerm}
        />
      )}

      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] bg-black/30 backdrop-blur-[2px]"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsOpen(false);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="term-form-title"
              style={dialogPosition}
              className="fixed max-h-[calc(100vh-32px)] overflow-y-auto rounded-xl border border-[#AFAFAF] bg-white px-5 pb-6 pt-9 shadow-2xl"
            >
              <h2 id="term-form-title" className="sr-only">
                แบบฟอร์มสร้างเทอม
              </h2>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="ปิดแบบฟอร์มสร้างเทอม"
                className="absolute right-2 top-2 rounded-full p-1 text-[#F05B87] transition-colors hover:bg-[#FFF0F5] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#F05B87]"
              >
                <X aria-hidden="true" size={24} strokeWidth={3} />
              </button>

              <div className="mb-5 pr-8">
                <p
                  className="text-xl text-[#5C7C8B]"
                  style={{ fontFamily: "var(--font-sansation)" }}
                >
                  สร้างเทอมใหม่
                </p>
                <p className="mt-1 text-xs text-[#8AA0AA]">
                  ระบุข้อมูลเทอมและช่วงสัปดาห์สอบให้ครบถ้วน
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-[104px_1fr] items-center gap-2">
                  <label htmlFor="academic-year" className="text-[17px] text-[#353535]">
                    ชั้นปีที่
                  </label>
                  <div className="max-w-[142px]">
                    <SelectField
                      id="academic-year"
                      name="academicYear"
                      placeholder="select year"
                      value={termFormValues.academicYear}
                      onChange={(value) =>
                        updateTermFormValue("academicYear", value)
                      }
                    >
                      {[1, 2, 3, 4].map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                </div>

                <div className="grid grid-cols-[104px_1fr] items-center gap-2">
                  <label htmlFor="semester" className="text-[17px] text-[#353535]">
                    ปีการศึกษา
                  </label>
                  <input
                    id="semester"
                    name="semester"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    required
                    value={termFormValues.semester}
                    onChange={(event) =>
                      updateTermFormValue(
                        "semester",
                        event.target.value.replace(/\D/g, "").slice(0, 4)
                      )
                    }
                    placeholder="enter academic year"
                    className="h-10 w-full max-w-[190px] rounded-full border border-[#C8C8C8] bg-white px-4 text-sm text-[#555555] outline-none placeholder:text-[#A7A7A7] focus:border-[#F080A7]"
                  />
                </div>

                <div className="grid grid-cols-[104px_1fr] items-center gap-2">
                  <label htmlFor="term-number" className="text-[17px] text-[#353535]">
                    เทอม
                  </label>
                  <div className="max-w-[142px]">
                    <SelectField
                      id="term-number"
                      name="term"
                      placeholder="select term"
                      value={termFormValues.term}
                      onChange={(value) => updateTermFormValue("term", value)}
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                    </SelectField>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-[#D7E7EE] bg-[#F7FBFD] p-3">
                  <p className="text-sm font-medium text-[#6D8996]">
                    ช่วงสัปดาห์สอบ
                  </p>
                  <ExamWeekField
                    label="สอบกลางภาค"
                    idPrefix="midterm"
                    startName="midtermStartDate"
                    endName="midtermEndDate"
                    startDate={termFormValues.midtermStartDate}
                    endDate={termFormValues.midtermEndDate}
                    onStartDateChange={(value) =>
                      updateTermFormValue("midtermStartDate", value)
                    }
                    onEndDateChange={(value) =>
                      updateTermFormValue("midtermEndDate", value)
                    }
                  />
                  <ExamWeekField
                    label="สอบปลายภาค"
                    idPrefix="final"
                    startName="finalStartDate"
                    endName="finalEndDate"
                    startDate={termFormValues.finalStartDate}
                    endDate={termFormValues.finalEndDate}
                    startMin={getNextDate(termFormValues.midtermEndDate)}
                    onStartDateChange={(value) =>
                      updateTermFormValue("finalStartDate", value)
                    }
                    onEndDateChange={(value) =>
                      updateTermFormValue("finalEndDate", value)
                    }
                  />
                </div>

                {validationError && (
                  <p
                    role="alert"
                    className="rounded-lg bg-[#FFF3F6] px-3 py-2 text-center text-xs text-[#E14F79]"
                  >
                    {validationError}
                  </p>
                )}

                {!isFormComplete && !validationError && (
                  <p className="text-center text-xs text-[#8AA0AA]">
                    *กรุณากรอกข้อมูลทุกช่องก่อนสร้างเทอม
                  </p>
                )}

                {formError && (
                  <p
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-xs text-red-600"
                  >
                    {formError}
                  </p>
                )}

                <div className="flex justify-center pt-3">
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="rounded-full border border-[#C8C8C8] bg-white px-5 py-1.5 text-sm text-[#555555] transition-colors hover:border-[#F080A7] hover:bg-[#FFF5F8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F080A7] disabled:cursor-wait disabled:opacity-60"
                  >
                    {isSubmitting ? "กำลังบันทึก..." : "ยืนยัน"}
                  </button>
                </div>
              </form>
            </section>
          </div>,
          document.body
        )}
    </>
  );
}
