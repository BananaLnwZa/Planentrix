"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronsUpDown, Plus, X } from "lucide-react";
import type { CurrentTerm } from "@/interfaces/profile.interface";
import termService from "@/services/term.service";
import TermDetailsPopup from "@/components/Main/TermDetailsPopup";

export type TermFormValues = {
  yearLevel: string;
  academicYear: string;
  term: string;
  examStartDate: string;
  examEndDate: string;
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

function formatDisplayDate(date?: string | null) {
  if (!date) return "—";
  const [year, month, day] = date.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
}

const thaiMonthNames = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

function formatThaiExamDate(date?: string | null) {
  if (!date) return "—";

  const [, month, day] = date.slice(0, 10).split("-");
  const monthName = thaiMonthNames[Number(month) - 1];

  return monthName && day ? `${Number(day)} ${monthName}` : formatDisplayDate(date);
}

function SelectField({
  id,
  name,
  placeholder,
  children,
}: {
  id: string;
  name: string;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full">
      <select
        id={id}
        name={name}
        defaultValue=""
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

export default function Term({ onAddTerm, onConfirm, onEndTerm }: TermProps) {
  const termCardRef = useRef<HTMLElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [examStartDate, setExamStartDate] = useState("");
  const [dateError, setDateError] = useState("");
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
    setDateError("");
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
      setExamStartDate("");
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

    const formData = new FormData(event.currentTarget);
    const values: TermFormValues = {
      yearLevel: String(formData.get("yearLevel") ?? ""),
      academicYear: String(formData.get("academicYear") ?? ""),
      term: String(formData.get("term") ?? ""),
      examStartDate: String(formData.get("examStartDate") ?? ""),
      examEndDate: String(formData.get("examEndDate") ?? ""),
    };

    if (values.examEndDate <= values.examStartDate) {
      setDateError("วันสิ้นสุดต้องอยู่หลังวันเริ่มต้น");
      return;
    }

    setDateError("");
    setFormError("");
    setIsSubmitting(true);

    try {
      const response = await termService.createTerm({
        year_level: values.yearLevel,
        term: values.term,
        academic_year: values.academicYear,
        start_midterm: values.examStartDate,
        end_midterm: values.examEndDate,
        start_final: values.examStartDate,
        end_final: values.examEndDate,
      });

      setCurrentTerm({
        term_id: response.term_id,
        year_level: values.yearLevel,
        term: values.term,
        academic_year: values.academicYear,
        start_midterm: values.examStartDate,
        end_midterm: values.examEndDate,
        start_final: values.examStartDate,
        end_final: values.examEndDate,
        term_status: 1,
      });
      onConfirm?.(values);
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
        className={`flex min-h-[116px] w-full max-w-[440px] flex-col items-center justify-center rounded-xl border border-[#AFAFAF] bg-white shadow-[0_6px_10px_rgba(75,93,102,0.24)] ${currentTerm ? "p-0" : "px-5 py-3"}`}
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
            className="group min-h-[114px] w-full rounded-[11px] px-5 py-3 text-left text-[#242424] transition-all duration-200 hover:bg-[#B9DFF0] hover:text-white hover:shadow-[0_8px_12px_rgba(75,93,102,0.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9CC5F9]"
            style={{ fontFamily: "var(--font-sansation)" }}
          >
            <span id="term-empty-title" className="sr-only">
              ข้อมูลเทอมปัจจุบัน
            </span>

            <div className="grid grid-cols-[auto_auto_auto] items-center justify-between gap-2">
              <div className="flex items-center gap-2 whitespace-nowrap text-[clamp(13px,2vw,16px)]">
                <span>ชั้นปีที่</span>
                <span className="flex h-9 min-w-[54px] items-center justify-center rounded-full border border-[#C8C8C8] bg-white px-3 text-[clamp(16px,2.2vw,19px)] leading-none text-[#242424] transition-colors duration-200 group-hover:text-[#82B5CF]">
                  {currentTerm.year_level}
                </span>
              </div>

              <div className="flex items-center gap-2 whitespace-nowrap text-[clamp(13px,2vw,16px)]">
                <span>ปีการศึกษา</span>
                <span className="flex h-9 min-w-[82px] items-center justify-center rounded-full border border-[#C8C8C8] bg-white px-3 text-[clamp(16px,2.2vw,19px)] leading-none text-[#242424] transition-colors duration-200 group-hover:text-[#82B5CF]">
                  {currentTerm.academic_year}
                </span>
              </div>

              <div className="flex items-center gap-2 whitespace-nowrap text-[clamp(13px,2vw,16px)]">
                <span>เทอม</span>
                <span className="flex h-9 min-w-[54px] items-center justify-center rounded-full border border-[#C8C8C8] bg-white px-3 text-[clamp(16px,2.2vw,19px)] leading-none text-[#242424] transition-colors duration-200 group-hover:text-[#82B5CF]">
                  {currentTerm.term}
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-3 whitespace-nowrap text-[clamp(13px,2vw,16px)]">
              <span>สัปดาห์สอบ</span>
              <span className="flex h-9 min-w-[220px] items-center justify-center rounded-full border border-[#C8C8C8] bg-white px-5 text-[clamp(15px,2.2vw,18px)] leading-none text-[#242424] transition-colors duration-200 group-hover:text-[#82B5CF]">
                {formatThaiExamDate(currentTerm.start_final)} –{" "}
                {formatThaiExamDate(currentTerm.end_final)}
              </span>
            </div>
          </button>
        ) : (
          <>
            <h2
              id="term-empty-title"
              className="text-center text-[20px] leading-none text-[#9CC5F9]"
              style={{ fontFamily: "var(--font-Sansation Light)" }}
            >
              *กรุณาระบุข้อมูลเทอมก่อนใช้งาน*
            </h2>

            <button
              type="button"
              onClick={openTermForm}
              aria-label="เพิ่มข้อมูลเทอม"
              aria-haspopup="dialog"
              className="mt-3 flex h-[46px] w-[106px] items-center justify-center rounded-full bg-[#A9DDFC] text-white transition-all duration-200 hover:scale-105 hover:bg-[#96D3F7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9CC5F9] active:scale-95"
            >
              <Plus aria-hidden="true" size={32} strokeWidth={3.5} />
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
          examStartLabel={formatThaiExamDate(currentTerm.start_final)}
          examEndLabel={formatThaiExamDate(currentTerm.end_final)}
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

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-[104px_1fr] items-center gap-2">
                  <label htmlFor="year-level" className="text-[17px] text-[#353535]">
                    ชั้นปีที่
                  </label>
                  <div className="max-w-[142px]">
                    <SelectField
                      id="year-level"
                      name="yearLevel"
                      placeholder="select year"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                </div>

                <div className="grid grid-cols-[104px_1fr] items-center gap-2">
                  <label htmlFor="academic-year" className="text-[17px] text-[#353535]">
                    ปีการศึกษา
                  </label>
                  <input
                    id="academic-year"
                    name="academicYear"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    required
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
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                    </SelectField>
                  </div>
                </div>

                <div className="grid grid-cols-[104px_1fr] items-center gap-2">
                  <label htmlFor="exam-start-date" className="text-[17px] text-[#353535]">
                    สัปดาห์สอบ
                  </label>
                  <div className="flex min-w-0 items-center gap-2">
                    <input
                      id="exam-start-date"
                      name="examStartDate"
                      type="date"
                      required
                      value={examStartDate}
                      onChange={(event) => {
                        setExamStartDate(event.target.value);
                        setDateError("");
                      }}
                      className="custom-date h-10 min-w-0 flex-1 rounded-full border border-[#C8C8C8] bg-white px-3 text-xs text-[#777777] outline-none focus:border-[#F080A7]"
                    />
                    <span aria-hidden="true" className="text-lg text-[#555555]">
                      –
                    </span>
                    <input
                      name="examEndDate"
                      type="date"
                      required
                      min={getNextDate(examStartDate)}
                      onChange={() => setDateError("")}
                      aria-label="วันสิ้นสุดสัปดาห์สอบ"
                      className="custom-date h-10 min-w-0 flex-1 rounded-full border border-[#C8C8C8] bg-white px-3 text-xs text-[#777777] outline-none focus:border-[#F080A7]"
                    />
                  </div>
                </div>

                {dateError && (
                  <p role="alert" className="pl-[112px] text-xs text-[#E14F79]">
                    {dateError}
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
                    disabled={isSubmitting}
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
