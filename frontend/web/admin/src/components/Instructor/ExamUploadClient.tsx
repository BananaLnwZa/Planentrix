"use client";

import {
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  CloudUpload,
  FileText,
  FolderPlus,
  Layers3,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent } from "react";
import type {
  InstructorExamQuestion,
  InstructorQuestionBank,
  InstructorQuestionBankDetailResponse,
  UpdateInstructorQuestionRequest,
} from "@/interfaces/instructor-exam.interface";
import instructorExamService from "@/services/instructor-exam.service";
import InstructorQuestionEditModal from "@/components/Instructor/InstructorQuestionEditModal";

type ExamPeriod = "midterm" | "final";
type ModalName = "part" | "exam" | null;

interface PartItem {
  id: string;
  name: string;
  subjectId: string;
  subjectLabel: string;
  examPeriod: ExamPeriod;
  createdAt: string;
  questionCount: number;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".docx",
];

const examPeriodOptions = [
  { value: "midterm", label: "กลางภาค" },
  { value: "final", label: "ปลายภาค" },
] as const;

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-[#dbe6ea] bg-[#fbfdfe] px-3.5 text-sm font-normal text-[#304852] outline-none transition focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa] disabled:cursor-not-allowed disabled:bg-[#f1f5f6] disabled:text-[#9ba8ad]";

interface CuteSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  icon: LucideIcon;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder: string;
  disabled?: boolean;
}

function CuteSelect({
  value,
  onValueChange,
  icon: Icon,
  options,
  placeholder,
  disabled = false,
}: CuteSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!isOpen) return;

    const closeWhenClickingOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", closeWhenClickingOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", closeWhenClickingOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="group relative mt-2">
      <span className="pointer-events-none absolute left-3 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg bg-[#dff1f6] text-[#4b879c] transition group-focus-within:bg-[#cae9f2]">
        <Icon aria-hidden="true" size={16} strokeWidth={1.9} />
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((currentState) => !currentState)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="h-12 w-full rounded-2xl border border-[#c9e1e9] bg-[linear-gradient(135deg,#ffffff_0%,#f2f9fb_100%)] pl-12 pr-11 text-left text-sm font-medium text-[#3f5963] shadow-[0_5px_16px_rgba(76,135,156,0.08)] outline-none transition hover:border-[#9fc9d7] hover:shadow-[0_7px_20px_rgba(76,135,156,0.12)] focus:border-[#69a4b8] focus:ring-4 focus:ring-[#dceff5] disabled:cursor-not-allowed disabled:border-[#dde7ea] disabled:bg-[#f3f6f7] disabled:text-[#9ba8ad] disabled:shadow-none"
      >
        <span className="block truncate">
          {selectedOption?.label ?? placeholder}
        </span>
      </button>
      <ChevronDown
        aria-hidden="true"
        className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6d9aaa] transition group-focus-within:text-[#39758c] ${
          isOpen ? "rotate-180" : ""
        }`}
        size={18}
        strokeWidth={2}
      />

      {isOpen && !disabled && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-2xl border border-[#c9e1e9] bg-white/95 p-1.5 shadow-[0_18px_45px_rgba(57,103,121,0.2)] backdrop-blur-xl"
        >
          {options.map((option) => {
            const selected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onValueChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm transition ${
                  selected
                    ? "bg-[#dff1f6] font-medium text-[#326d82]"
                    : "text-[#526a74] hover:bg-[#eef8fb] hover:text-[#39758c]"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {selected && (
                  <Check
                    aria-hidden="true"
                    className="shrink-0 text-[#4b879c]"
                    size={17}
                    strokeWidth={2.3}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex >= 0 ? fileName.slice(lastDotIndex).toLowerCase() : "";
}

function getPeriodLabel(period: ExamPeriod) {
  return period === "midterm" ? "กลางภาค" : "ปลายภาค";
}

function formatCreatedDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getChoiceLabel(choiceOrder: number, choiceIndex: number) {
  const thaiChoiceLabels = ["ก", "ข", "ค", "ง", "จ", "ฉ"];
  return thaiChoiceLabels[choiceOrder - 1] ??
    thaiChoiceLabels[choiceIndex] ??
    String(choiceOrder || choiceIndex + 1);
}

function formatScore(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(2);
}

function mapQuestionBankToPart(bank: InstructorQuestionBank): PartItem {
  return {
    id: String(bank.question_bank_id),
    name: bank.bank_name,
    subjectId: bank.subject_id,
    subjectLabel: `${bank.subject_id} · ${bank.subject_name}`,
    examPeriod: bank.exam_period,
    createdAt: formatCreatedDate(bank.created_at),
    questionCount: bank.question_count,
  };
}

export default function ExamUploadClient() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeModal, setActiveModal] = useState<ModalName>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [partFilterSubjectId, setPartFilterSubjectId] = useState("");
  const [partFilterPeriod, setPartFilterPeriod] = useState<ExamPeriod | "">(
    "",
  );
  const [subjectOptions, setSubjectOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [parts, setParts] = useState<PartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");

  const [partName, setPartName] = useState("");
  const [partSubjectId, setPartSubjectId] = useState("");
  const [partPeriod, setPartPeriod] = useState<ExamPeriod>("midterm");
  const [partError, setPartError] = useState("");

  const [examSubjectId, setExamSubjectId] = useState("");
  const [examPartId, setExamPartId] = useState("");
  const [examPeriod, setExamPeriod] = useState<ExamPeriod>("midterm");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [examError, setExamError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedPart, setSelectedPart] = useState<PartItem | null>(null);
  const [partDetail, setPartDetail] =
    useState<InstructorQuestionBankDetailResponse | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [isClearingQuestions, setIsClearingQuestions] = useState(false);
  const [editingQuestion, setEditingQuestion] =
    useState<InstructorExamQuestion | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<number | null>(
    null,
  );

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    setWorkspaceError("");
    try {
      const response = await instructorExamService.getWorkspace();
      setSubjectOptions(
        response.subjects.map((subject) => ({
          value: subject.subject_id,
          label: `${subject.subject_id} · ${subject.subject_name}`,
        })),
      );
      setParts(response.question_banks.map(mapQuestionBankToPart));
    } catch (error) {
      setWorkspaceError(
        error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลข้อสอบได้",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadWorkspace();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadWorkspace]);

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("th");

  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
      const matchesSubject =
        !partFilterSubjectId || part.subjectId === partFilterSubjectId;
      const matchesPeriod =
        !partFilterPeriod || part.examPeriod === partFilterPeriod;
      const matchesSearch =
        !normalizedSearch ||
        [part.name, part.subjectLabel, getPeriodLabel(part.examPeriod)].some(
          (value) => value.toLocaleLowerCase("th").includes(normalizedSearch),
        );

      return matchesSubject && matchesPeriod && matchesSearch;
    });
  }, [normalizedSearch, partFilterPeriod, partFilterSubjectId, parts]);

  const selectableParts = parts.filter(
    (part) =>
      part.subjectId === examSubjectId && part.examPeriod === examPeriod,
  );

  const closeModal = () => {
    setActiveModal(null);
    setPartError("");
    setExamError("");
    setIsDragging(false);
  };

  const resetPartForm = () => {
    setPartName("");
    setPartSubjectId("");
    setPartPeriod("midterm");
    setPartError("");
  };

  const resetExamForm = () => {
    setExamSubjectId("");
    setExamPartId("");
    setExamPeriod("midterm");
    setSelectedFile(null);
    setExamError("");
    setIsDragging(false);
  };

  const handleCreatePart = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedPartName = partName.trim();

    if (!partSubjectId || !normalizedPartName) {
      setPartError("กรุณาเลือกวิชาและกรอกชื่อพาร์ท");
      return;
    }

    const duplicatedPart = parts.some(
      (part) =>
        part.subjectId === partSubjectId &&
        part.examPeriod === partPeriod &&
        part.name.toLocaleLowerCase("th") ===
          normalizedPartName.toLocaleLowerCase("th"),
    );

    if (duplicatedPart) {
      setPartError("มีพาร์ทชื่อนี้ในวิชาและช่วงสอบที่เลือกแล้ว");
      return;
    }

    setIsSaving(true);
    setPartError("");
    try {
      const response = await instructorExamService.createQuestionBank({
        subject_id: partSubjectId,
        bank_name: normalizedPartName,
        exam_period: partPeriod,
      });
      setNotice(`สร้างพาร์ท “${response.question_bank.bank_name}” แล้ว`);
      resetPartForm();
      closeModal();
      await loadWorkspace();
    } catch (error) {
      setPartError(
        error instanceof Error ? error.message : "ไม่สามารถสร้างพาร์ทได้",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const selectFile = (file?: File) => {
    if (!file) return;

    const extension = getFileExtension(file.name);
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setSelectedFile(null);
      setExamError("รองรับเฉพาะไฟล์ PDF และ Word (.docx) เท่านั้น");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setExamError("ไฟล์ต้องมีขนาดไม่เกิน 20 MB");
      return;
    }

    setSelectedFile(file);
    setExamError("");
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  };

  const handleCreateExam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!examSubjectId || !examPartId || !selectedFile) {
      setExamError("กรุณาเลือกวิชา เลือกพาร์ท และแนบไฟล์ข้อสอบให้ครบ");
      return;
    }

    const selectedPart = parts.find((part) => part.id === examPartId);

    if (!selectedPart) {
      setExamError("ไม่พบพาร์ทที่เลือก กรุณาเลือกใหม่อีกครั้ง");
      return;
    }

    setIsSaving(true);
    setExamError("");
    try {
      const response = await instructorExamService.importExamFile(
        Number(selectedPart.id),
        selectedFile,
      );
      setNotice(
        `นำเข้าไฟล์ “${selectedFile.name}” สำเร็จ ${response.total_questions_imported} ข้อ`,
      );
      resetExamForm();
      closeModal();
      await loadWorkspace();
    } catch (error) {
      setExamError(
        error instanceof Error ? error.message : "ไม่สามารถนำเข้าไฟล์ข้อสอบได้",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const removePart = async (partId: string) => {
    setWorkspaceError("");
    try {
      await instructorExamService.deleteQuestionBank(Number(partId));
      if (selectedPart?.id === partId) {
        setSelectedPart(null);
        setPartDetail(null);
      }
      setNotice("ลบพาร์ทและข้อสอบที่อยู่ในพาร์ทนี้แล้ว");
      await loadWorkspace();
    } catch (error) {
      setWorkspaceError(
        error instanceof Error ? error.message : "ไม่สามารถลบพาร์ทได้",
      );
    }
  };

  const openPartDetail = async (part: PartItem) => {
    setSelectedPart(part);
    setPartDetail(null);
    setDetailError("");
    setIsDetailLoading(true);
    try {
      const detail = await instructorExamService.getQuestionBankDetail(
        Number(part.id),
      );
      setPartDetail(detail);
    } catch (error) {
      setDetailError(
        error instanceof Error ? error.message : "ไม่สามารถโหลดข้อสอบได้",
      );
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closePartDetail = () => {
    if (isClearingQuestions || deletingQuestionId !== null) return;
    setSelectedPart(null);
    setPartDetail(null);
    setDetailError("");
    setEditingQuestion(null);
  };

  const saveQuestionChanges = async (
    payload: UpdateInstructorQuestionRequest,
  ) => {
    if (!selectedPart || !editingQuestion) return;
    await instructorExamService.updateQuestion(
      Number(selectedPart.id),
      editingQuestion.question_id,
      payload,
    );
    const updatedDetail = await instructorExamService.getQuestionBankDetail(
      Number(selectedPart.id),
    );
    setPartDetail(updatedDetail);
    setEditingQuestion(null);
    setNotice("บันทึกการแก้ไขข้อสอบแล้ว");
  };

  const deleteQuestion = async (question: InstructorExamQuestion) => {
    if (!selectedPart) return;
    if (!window.confirm("ต้องการลบข้อสอบข้อนี้ใช่ไหม")) return;

    setDeletingQuestionId(question.question_id);
    setDetailError("");
    try {
      await instructorExamService.deleteQuestion(
        Number(selectedPart.id),
        question.question_id,
      );
      setPartDetail((currentDetail) =>
        currentDetail
          ? {
              ...currentDetail,
              question_bank: {
                ...currentDetail.question_bank,
                question_count: Math.max(
                  0,
                  currentDetail.question_bank.question_count - 1,
                ),
              },
              questions: currentDetail.questions.filter(
                (currentQuestion) =>
                  currentQuestion.question_id !== question.question_id,
              ),
            }
          : currentDetail,
      );
      setSelectedPart((currentPart) =>
        currentPart
          ? {
              ...currentPart,
              questionCount: Math.max(0, currentPart.questionCount - 1),
            }
          : currentPart,
      );
      setNotice("ลบข้อสอบข้อนี้แล้ว");
      await loadWorkspace();
    } catch (error) {
      setDetailError(
        error instanceof Error ? error.message : "ไม่สามารถลบข้อสอบข้อนี้ได้",
      );
    } finally {
      setDeletingQuestionId(null);
    }
  };

  const clearSelectedPartQuestions = async () => {
    if (!selectedPart) return;
    if (!window.confirm("ต้องการลบข้อสอบทั้งหมดในพาร์ทนี้ใช่ไหม")) return;

    setIsClearingQuestions(true);
    setDetailError("");
    try {
      await instructorExamService.clearQuestions(Number(selectedPart.id));
      setNotice("ลบคำถามทั้งหมดออกจากพาร์ทแล้ว");
      setPartDetail((currentDetail) =>
        currentDetail
          ? {
              ...currentDetail,
              question_bank: {
                ...currentDetail.question_bank,
                question_count: 0,
              },
              questions: [],
            }
          : currentDetail,
      );
      setSelectedPart((currentPart) =>
        currentPart ? { ...currentPart, questionCount: 0 } : currentPart,
      );
      await loadWorkspace();
    } catch (error) {
      setDetailError(
        error instanceof Error ? error.message : "ไม่สามารถลบข้อสอบได้",
      );
    } finally {
      setIsClearingQuestions(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[26px] border border-[#dcebf0] bg-white/85 p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[#4f879c]">จัดการข้อสอบ</p>
            <h3 className="mt-1 text-xl text-[#304b56]">
              สร้างพาร์ทและเพิ่มไฟล์ข้อสอบ
            </h3>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={isLoading || isSaving || subjectOptions.length === 0}
              onClick={() => {
                resetPartForm();
                setActiveModal("part");
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#9fc8d6] bg-white px-5 text-sm font-medium text-[#3f7d93] transition hover:-translate-y-0.5 hover:bg-[#edf8fb] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dceff5] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <FolderPlus aria-hidden="true" size={18} />
              สร้างพาร์ท
            </button>
            <button
              type="button"
              disabled={isLoading || isSaving || parts.length === 0}
              onClick={() => {
                resetExamForm();
                setActiveModal("exam");
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#5794aa] px-5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#477f93] hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#cfe7ef] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <Plus aria-hidden="true" size={18} />
              สร้างข้อสอบ
            </button>
          </div>
        </div>

        <div className="relative mt-6">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7f969f]"
            size={19}
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="ค้นหาชื่อพาร์ท วิชา หรือช่วงสอบ"
            className="h-12 w-full rounded-2xl border border-[#cfdee4] bg-[#fbfdfe] pl-11 pr-4 text-sm text-[#3d555f] outline-none transition placeholder:text-[#9aa8ad] focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]"
          />
        </div>

        {isLoading && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#d6e7ec] bg-[#f5fafc] px-4 py-3 text-sm text-[#607983]">
            <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
            กำลังโหลดข้อมูลจากระบบ
          </div>
        )}

        {workspaceError && (
          <div
            role="alert"
            className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#efcaca] bg-[#fff6f6] px-4 py-3 text-sm text-[#a65353] sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{workspaceError}</span>
            <button
              type="button"
              onClick={() => void loadWorkspace()}
              className="shrink-0 rounded-full border border-[#e4baba] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#fff0f0]"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2 rounded-2xl border border-[#c8e4d5] bg-[#f3fbf6] px-4 py-3 text-sm text-[#43755a]"
          >
            <CheckCircle2 aria-hidden="true" className="shrink-0" size={18} />
            <span>{notice}</span>
          </div>
        )}
      </section>

      <section className="rounded-[26px] border border-[#dcebf0] bg-white/85 p-5 shadow-sm sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#4f879c]">Parts</p>
            <h3 className="mt-1 text-xl text-[#304b56]">พาร์ทที่มีอยู่</h3>
          </div>
          <span className="rounded-full bg-[#eaf6fa] px-3 py-1.5 text-xs font-medium text-[#4f879c]">
            {filteredParts.length} พาร์ท
          </span>
        </div>

        <div className="mt-5 grid gap-4 rounded-2xl border border-[#e0ecef] bg-[#f8fcfd] p-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-[#4c626c]">
            กรองตามวิชา
            <CuteSelect
              value={partFilterSubjectId}
              icon={BookOpen}
              options={[
                { value: "", label: "ทุกวิชา" },
                ...subjectOptions,
              ]}
              placeholder="ทุกวิชา"
              onValueChange={setPartFilterSubjectId}
            />
          </label>

          <label className="block text-sm font-medium text-[#4c626c]">
            กรองตามช่วงสอบ
            <CuteSelect
              value={partFilterPeriod}
              icon={CalendarDays}
              options={[
                { value: "", label: "ทุกช่วงสอบ" },
                ...examPeriodOptions,
              ]}
              placeholder="ทุกช่วงสอบ"
              onValueChange={(nextValue) =>
                setPartFilterPeriod(nextValue as ExamPeriod | "")
              }
            />
          </label>
        </div>

        {filteredParts.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[#cbdde3] bg-[#f8fbfc] px-5 py-10 text-center">
            <BookOpen
              aria-hidden="true"
              className="mx-auto text-[#91afba]"
              size={29}
              strokeWidth={1.6}
            />
            <p className="mt-3 text-sm font-medium text-[#637982]">
              {parts.length === 0 ? "ยังไม่มีพาร์ท" : "ไม่พบพาร์ทที่ค้นหา"}
            </p>
            <p className="mt-1 text-xs text-[#95a3a8]">
              {parts.length === 0
                ? "กดปุ่มสร้างพาร์ทเพื่อเริ่มต้น"
                : "ลองเปลี่ยนคำค้นหาหรือตัวกรองอีกครั้ง"}
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {filteredParts.map((part) => (
              <article
                key={part.id}
                className="group flex items-center gap-2 rounded-2xl border border-[#dce8ec] bg-[#fbfdfe] p-2 transition hover:-translate-y-0.5 hover:border-[#acd0dc] hover:bg-white hover:shadow-[0_10px_28px_rgba(67,112,129,0.10)]"
              >
                <button
                  type="button"
                  onClick={() => void openPartDetail(part)}
                  className="flex min-w-0 flex-1 items-start gap-4 rounded-xl p-2 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dceff5]"
                  aria-label={`เปิดข้อสอบในพาร์ท ${part.name}`}
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#e8f6fa] text-[#4f8da3] transition group-hover:bg-[#dff2f7]">
                    <FolderPlus aria-hidden="true" size={21} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-medium text-[#38535e]">
                      {part.name}
                    </h4>
                    <p className="mt-1 truncate text-xs text-[#7d8f96]">
                      {part.subjectLabel}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#70838b]">
                      <span className="rounded-full bg-[#eef6f8] px-2.5 py-1">
                        {getPeriodLabel(part.examPeriod)}
                      </span>
                      <span>{part.questionCount} ข้อ</span>
                      <span>{part.createdAt}</span>
                    </div>
                    <p className="mt-2 text-xs font-medium text-[#5794aa]">
                      กดเพื่อดูข้อสอบแยกเป็นข้อ
                    </p>
                  </div>
                  <ChevronRight
                    aria-hidden="true"
                    className="mt-3 shrink-0 text-[#8eb3c0] transition group-hover:translate-x-0.5 group-hover:text-[#5794aa]"
                    size={19}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => void removePart(part.id)}
                  aria-label={`ลบพาร์ท ${part.name}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#a76262] transition hover:bg-[#f7e5e5] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f1d7d7]"
                >
                  <Trash2 aria-hidden="true" size={17} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedPart && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#243b45]/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="part-detail-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePartDetail();
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-[#fafdfe] shadow-[0_28px_80px_rgba(28,54,65,0.25)]">
            <div className="border-b border-[#dce9ed] bg-white px-5 py-5 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#4f879c]">
                    Questions in Part
                  </p>
                  <h3
                    id="part-detail-title"
                    className="mt-1 truncate text-xl font-semibold text-[#304852]"
                  >
                    {selectedPart.name}
                  </h3>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#6e838c]">
                    <span className="rounded-full bg-[#eaf6fa] px-3 py-1.5 text-[#477f93]">
                      {selectedPart.subjectLabel}
                    </span>
                    <span className="rounded-full bg-[#f1f5f6] px-3 py-1.5">
                      {getPeriodLabel(selectedPart.examPeriod)}
                    </span>
                    <span className="rounded-full bg-[#f1f5f6] px-3 py-1.5">
                      {partDetail?.questions.length ?? selectedPart.questionCount} ข้อ
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closePartDetail}
                  disabled={isClearingQuestions}
                  aria-label="ปิดรายละเอียดพาร์ท"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-[#71858d] transition hover:bg-[#edf4f6] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dceff5] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X aria-hidden="true" size={20} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
              {isDetailLoading && (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbdde3] bg-white text-[#607983]">
                  <LoaderCircle
                    aria-hidden="true"
                    className="animate-spin text-[#5794aa]"
                    size={28}
                  />
                  <p className="mt-3 text-sm">กำลังโหลดข้อสอบในพาร์ท</p>
                </div>
              )}

              {!isDetailLoading && detailError && (
                <div
                  role="alert"
                  className="rounded-2xl border border-[#efcaca] bg-[#fff6f6] px-5 py-6 text-center text-sm text-[#a65353]"
                >
                  <p>{detailError}</p>
                  <button
                    type="button"
                    onClick={() => void openPartDetail(selectedPart)}
                    className="mt-4 rounded-full border border-[#e4baba] bg-white px-4 py-2 text-xs font-medium transition hover:bg-[#fff0f0]"
                  >
                    ลองโหลดอีกครั้ง
                  </button>
                </div>
              )}

              {!isDetailLoading && !detailError && partDetail?.questions.length === 0 && (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbdde3] bg-white px-5 text-center">
                  <ClipboardCheck
                    aria-hidden="true"
                    className="text-[#91afba]"
                    size={31}
                    strokeWidth={1.6}
                  />
                  <p className="mt-3 text-sm font-medium text-[#637982]">
                    พาร์ทนี้ยังไม่มีข้อสอบ
                  </p>
                  <p className="mt-1 text-xs text-[#95a3a8]">
                    ปิดหน้าต่างนี้ แล้วกดปุ่มสร้างข้อสอบเพื่อเพิ่มไฟล์
                  </p>
                </div>
              )}

              {!isDetailLoading &&
                !detailError &&
                partDetail &&
                partDetail.questions.length > 0 && (
                  <div className="space-y-4">
                    {partDetail.questions.map((question, questionIndex) => (
                      <article
                        key={question.question_id}
                        className="rounded-2xl border border-[#dce8ec] bg-white p-5 shadow-[0_5px_16px_rgba(67,112,129,0.05)] sm:p-6"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e8f6fa] text-xs font-semibold text-[#477f93]">
                              {questionIndex + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-[#6e939f]">
                                ข้อ {questionIndex + 1}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-[15px] leading-7 text-[#304852]">
                                {question.question_text}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className="rounded-full bg-[#fff4dc] px-3 py-1.5 text-xs font-medium text-[#946f2f]">
                              {formatScore(question.question_score)} คะแนน
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingQuestion(question)}
                              disabled={deletingQuestionId !== null}
                              aria-label={`แก้ไขข้อสอบข้อ ${questionIndex + 1}`}
                              title="แก้ไขข้อสอบ"
                              className="flex size-8 items-center justify-center rounded-full text-[#4f879c] transition hover:bg-[#e6f4f8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dceff5] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Pencil aria-hidden="true" size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteQuestion(question)}
                              disabled={deletingQuestionId !== null}
                              aria-label={`ลบข้อสอบข้อ ${questionIndex + 1}`}
                              title="ลบข้อสอบ"
                              className="flex size-8 items-center justify-center rounded-full text-[#ad6262] transition hover:bg-[#f9eaea] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f1d7d7] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {deletingQuestionId === question.question_id ? (
                                <LoaderCircle
                                  aria-hidden="true"
                                  className="animate-spin"
                                  size={15}
                                />
                              ) : (
                                <Trash2 aria-hidden="true" size={15} />
                              )}
                            </button>
                          </div>
                        </div>

                        {question.choices.length === 0 ? (
                          <p className="ml-11 mt-4 rounded-xl bg-[#f5f8f9] px-4 py-3 text-sm text-[#84949a]">
                            ข้อนี้ไม่มีตัวเลือก
                          </p>
                        ) : (
                          <div className="ml-0 mt-5 grid gap-2.5 sm:ml-11">
                            {question.choices.map((choice, choiceIndex) => (
                              <div
                                key={choice.choice_id}
                                className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                                  choice.is_correct
                                    ? "border-[#aed8bd] bg-[#f0faf4] text-[#356b49]"
                                    : "border-[#e0e8eb] bg-[#fbfdfe] text-[#526871]"
                                }`}
                              >
                                <span
                                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                                    choice.is_correct
                                      ? "bg-[#cdebd8] text-[#2f7549]"
                                      : "bg-[#edf3f5] text-[#617780]"
                                  }`}
                                >
                                  {getChoiceLabel(choice.choice_order, choiceIndex)}
                                </span>
                                <span className="min-w-0 flex-1 whitespace-pre-wrap pt-0.5 leading-6">
                                  {choice.choice_text}
                                </span>
                                {choice.is_correct && (
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#d9f0e2] px-2.5 py-1 text-xs font-medium text-[#35724c]">
                                    <CheckCircle2 aria-hidden="true" size={14} />
                                    ข้อถูก
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#dce9ed] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <button
                type="button"
                onClick={() => void clearSelectedPartQuestions()}
                disabled={
                  isDetailLoading ||
                  isClearingQuestions ||
                  !partDetail ||
                  partDetail.questions.length === 0
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm text-[#a45d5d] transition hover:bg-[#f9eaea] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f1d7d7] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isClearingQuestions ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
                ) : (
                  <Trash2 aria-hidden="true" size={17} />
                )}
                {isClearingQuestions ? "กำลังลบ" : "ลบข้อสอบทั้งหมด"}
              </button>
              <button
                type="button"
                onClick={closePartDetail}
                disabled={isClearingQuestions}
                className="rounded-xl bg-[#5794aa] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#477f93] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#cfe7ef] disabled:cursor-not-allowed disabled:opacity-50"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {editingQuestion && (
        <InstructorQuestionEditModal
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSave={saveQuestionChanges}
        />
      )}

      {activeModal === "part" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#243b45]/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-part-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) closeModal();
          }}
        >
          <div className="w-full max-w-lg rounded-[26px] border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(28,54,65,0.25)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#4f879c]">
                  New Part
                </p>
                <h3
                  id="create-part-title"
                  className="mt-1 text-xl font-semibold text-[#304852]"
                >
                  สร้างพาร์ท
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                aria-label="ปิด"
                className="rounded-full p-2 text-[#7d9098] transition hover:bg-[#edf4f6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X aria-hidden="true" size={19} />
              </button>
            </div>

            <form onSubmit={handleCreatePart} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-[#4c626c]">
                วิชา
                <CuteSelect
                  value={partSubjectId}
                  icon={BookOpen}
                  options={subjectOptions}
                  placeholder="เลือกวิชา"
                  onValueChange={(nextValue) => {
                    setPartSubjectId(nextValue);
                    setPartError("");
                  }}
                />
              </label>

              <label className="block text-sm font-medium text-[#4c626c]">
                ชื่อพาร์ท
                <input
                  autoFocus
                  value={partName}
                  onChange={(event) => {
                    setPartName(event.target.value);
                    setPartError("");
                  }}
                  maxLength={100}
                  placeholder="เช่น Part 1: ปรนัย"
                  className={inputClass}
                />
              </label>

              <fieldset>
                <legend className="text-sm font-medium text-[#4c626c]">
                  ช่วงสอบ
                </legend>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {(
                    [
                      { value: "midterm", label: "กลางภาค" },
                      { value: "final", label: "ปลายภาค" },
                    ] as const
                  ).map((period) => (
                    <label
                      key={period.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm transition ${
                        partPeriod === period.value
                          ? "border-[#79bdd4] bg-[#edf8fb] text-[#376f84]"
                          : "border-[#dbe6ea] text-[#647981]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="partPeriod"
                        checked={partPeriod === period.value}
                        onChange={() => setPartPeriod(period.value)}
                        className="accent-[#5794aa]"
                      />
                      {period.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {partError && (
                <p
                  role="alert"
                  className="rounded-xl bg-[#fff0ec] px-3.5 py-3 text-sm text-[#a9503c]"
                >
                  {partError}
                </p>
              )}

              <p className="text-xs leading-5 text-[#8b999e]">
                พาร์ทที่สร้างจะถูกบันทึกลงคลังข้อสอบของอาจารย์ทันที
              </p>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="rounded-xl px-4 py-2.5 text-sm text-[#687b84] transition hover:bg-[#eef4f6] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-[#5794aa] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#477f93] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
                  ) : (
                    <FolderPlus aria-hidden="true" size={17} />
                  )}
                  {isSaving ? "กำลังสร้าง" : "สร้างพาร์ท"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === "exam" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#243b45]/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-exam-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) closeModal();
          }}
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[26px] border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(28,54,65,0.25)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#4f879c]">
                  New Exam
                </p>
                <h3
                  id="create-exam-title"
                  className="mt-1 text-xl font-semibold text-[#304852]"
                >
                  สร้างข้อสอบ
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                aria-label="ปิด"
                className="rounded-full p-2 text-[#7d9098] transition hover:bg-[#edf4f6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X aria-hidden="true" size={19} />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-[#4c626c]">
                  วิชา
                  <CuteSelect
                    value={examSubjectId}
                    icon={BookOpen}
                    options={subjectOptions}
                    placeholder="เลือกวิชา"
                    onValueChange={(nextValue) => {
                      setExamSubjectId(nextValue);
                      setExamPartId("");
                      setExamError("");
                    }}
                  />
                </label>

                <label className="block text-sm font-medium text-[#4c626c]">
                  ช่วงสอบ
                  <CuteSelect
                    value={examPeriod}
                    icon={CalendarDays}
                    options={examPeriodOptions}
                    placeholder="เลือกช่วงสอบ"
                    onValueChange={(nextValue) => {
                      setExamPeriod(nextValue as ExamPeriod);
                      setExamPartId("");
                      setExamError("");
                    }}
                  />
                </label>

                <label className="block text-sm font-medium text-[#4c626c] sm:col-span-2">
                  พาร์ท
                  <CuteSelect
                    value={examPartId}
                    icon={Layers3}
                    options={selectableParts.map((part) => ({
                      value: part.id,
                      label: part.name,
                    }))}
                    placeholder={
                      !examSubjectId
                        ? "เลือกวิชาก่อน"
                        : selectableParts.length === 0
                          ? "ยังไม่มีพาร์ทในวิชาและช่วงสอบนี้"
                          : "เลือกพาร์ท"
                    }
                    onValueChange={(nextValue) => {
                      setExamPartId(nextValue);
                      setExamError("");
                    }}
                    disabled={!examSubjectId || selectableParts.length === 0}
                  />
                </label>
              </div>

              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setIsDragging(false);
                  }
                }}
                onDrop={handleDrop}
                className={`rounded-2xl border-2 border-dashed px-5 py-8 text-center transition ${
                  isDragging
                    ? "border-[#5794aa] bg-[#eaf7fb]"
                    : "border-[#bcd6df] bg-[#f8fcfd] hover:border-[#79acbd]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_EXTENSIONS.join(",")}
                  onChange={handleFileChange}
                  className="sr-only"
                  aria-label="เลือกไฟล์ข้อสอบ"
                />
                <CloudUpload
                  aria-hidden="true"
                  className="mx-auto text-[#5794aa]"
                  size={32}
                  strokeWidth={1.7}
                />
                <p className="mt-3 text-sm font-medium text-[#38535e]">
                  ลากไฟล์มาวาง หรือกดเลือกไฟล์
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 rounded-full bg-[#5794aa] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#477f93] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#cfe7ef]"
                >
                  เลือกไฟล์
                </button>
                <p className="mt-3 text-xs text-[#8a989e]">
                  PDF หรือ Word (.docx) ขนาดไม่เกิน 20 MB
                </p>
              </div>

              {selectedFile && (
                <div className="flex items-center gap-3 rounded-2xl border border-[#cfe4db] bg-[#f4fbf7] p-4">
                  <FileText
                    aria-hidden="true"
                    className="shrink-0 text-[#4f9471]"
                    size={22}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#395b4a]">
                      {selectedFile.name}
                    </p>
                    <p className="mt-1 text-xs text-[#789184]">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    aria-label="นำไฟล์ออก"
                    className="rounded-full p-2 text-[#a76262] transition hover:bg-[#f7e5e5]"
                  >
                    <Trash2 aria-hidden="true" size={18} />
                  </button>
                </div>
              )}

              {examError && (
                <p
                  role="alert"
                  className="rounded-xl bg-[#fff0ec] px-3.5 py-3 text-sm text-[#a9503c]"
                >
                  {examError}
                </p>
              )}

              <div className="flex items-center gap-2 rounded-xl bg-[#f5f8f9] px-3.5 py-3 text-xs leading-5 text-[#7d8d93]">
                <CalendarDays aria-hidden="true" className="shrink-0" size={16} />
                ระบบจะแยกคำถาม ตัวเลือก เฉลย และรูปภาพลงในพาร์ทที่เลือก
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="rounded-xl px-4 py-2.5 text-sm text-[#687b84] transition hover:bg-[#eef4f6] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-[#5794aa] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#477f93] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
                  ) : (
                    <ClipboardCheck aria-hidden="true" size={17} />
                  )}
                  {isSaving ? "กำลังนำเข้า" : "สร้างข้อสอบ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
