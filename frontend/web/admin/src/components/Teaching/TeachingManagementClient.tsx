"use client";

import {
  AlertCircle,
  BookOpen,
  Building2,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  CircleOff,
  ClipboardCheck,
  Clock3,
  DoorOpen,
  GraduationCap,
  Layers3,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type {
  AcademicTermStatus,
  CourseSectionStatus,
  SaveAcademicTermPayload,
  SaveCourseSectionPayload,
  TeachingAcademicTerm,
  TeachingClassMeeting,
  TeachingCourseSection,
  TeachingCurriculumSubject,
  TeachingInstructor,
  TeachingSubject,
  TeachingWorkspaceResponse,
} from "@/interfaces/teaching-management.interface";
import { teachingManagementService } from "@/services/teaching-management.service";
import AdminSelect from "@/components/ui/AdminSelect";
import ClassMeetingModal, {
  classMeetingDayLabels,
} from "@/components/Teaching/ClassMeetingModal";

const sectionStatusOptions: Array<{ value: CourseSectionStatus; label: string }> = [
  { value: "draft", label: "ฉบับร่าง" },
  { value: "open", label: "เปิดสอน" },
  { value: "closed", label: "ปิดรับ" },
  { value: "completed", label: "สอนเสร็จแล้ว" },
  { value: "cancelled", label: "ยกเลิก" },
];

const statusStyles: Record<CourseSectionStatus, string> = {
  draft: "bg-[#f1f3f4] text-[#66757b]",
  open: "bg-[#e8f8ef] text-[#3c7b59]",
  closed: "bg-[#fff4dc] text-[#956b25]",
  completed: "bg-[#eaf3fb] text-[#477493]",
  cancelled: "bg-[#fff0ec] text-[#a65d4a]",
};

const statusLabel = (status: CourseSectionStatus) =>
  sectionStatusOptions.find((option) => option.value === status)?.label ?? status;

const termStatusLabel: Record<AcademicTermStatus, string> = {
  draft: "ฉบับร่าง",
  active: "กำลังใช้งาน",
  completed: "สิ้นสุดแล้ว",
  archived: "จัดเก็บแล้ว",
};

const termStatusStyles: Record<AcademicTermStatus, string> = {
  draft: "bg-[#f1f3f4] text-[#66757b]",
  active: "bg-[#e8f8ef] text-[#3c7b59]",
  completed: "bg-[#eaf3fb] text-[#477493]",
  archived: "bg-[#f3eff8] text-[#75638c]",
};

const nextTermStatus: Record<
  AcademicTermStatus,
  { status: AcademicTermStatus; label: string }
> = {
  draft: { status: "active", label: "เปิดใช้งาน" },
  active: { status: "completed", label: "สิ้นสุดเทอม" },
  completed: { status: "archived", label: "จัดเก็บ" },
  archived: { status: "draft", label: "นำกลับเป็นฉบับร่าง" },
};

const formatTermDate = (date: string | null) => {
  if (!date) return "ไม่ระบุ";
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
};

const dateInputClass =
  "mt-2 h-11 w-full rounded-xl border border-[#dbe6ea] bg-[#fbfdfe] px-3.5 text-sm font-normal text-[#304852] outline-none transition focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]";

type TeachingFlowStep = "terms" | "sections" | "schedule" | "readiness";

const teachingFlowSteps: Array<{
  value: TeachingFlowStep;
  label: string;
  description: string;
  icon: typeof CalendarDays;
}> = [
  { value: "terms", label: "1. ภาคการศึกษา", description: "สร้างเทอมฉบับร่าง", icon: CalendarDays },
  { value: "sections", label: "2. วิชาและ Section", description: "เลือกวิชาและกลุ่มผู้เรียน", icon: BookOpen },
  { value: "schedule", label: "3. ผู้สอนและตาราง", description: "จัดอาจารย์ วัน เวลา และห้อง", icon: Clock3 },
  { value: "readiness", label: "4. ตรวจสอบความพร้อม", description: "ตรวจแล้วเปิดภาคการศึกษา", icon: ClipboardCheck },
];

const preferredTermId = (workspace: TeachingWorkspaceResponse) => {
  const term =
    workspace.academic_terms.find((item) => item.status === "draft") ??
    workspace.academic_terms.find((item) => item.status === "active") ??
    workspace.academic_terms[0];
  return term ? String(term.academic_term_id) : "";
};

interface TermModalProps {
  term: TeachingAcademicTerm | null;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}

function TermModal({ term, onClose, onSaved }: TermModalProps) {
  const [academicYear, setAcademicYear] = useState(
    String(term?.academic_year ?? new Date().getFullYear() + 543),
  );
  const [semesterNo, setSemesterNo] = useState(String(term?.semester_no ?? 1));
  const [startDate, setStartDate] = useState(term?.start_date ?? "");
  const [endDate, setEndDate] = useState(term?.end_date ?? "");
  const [midtermStart, setMidtermStart] = useState(term?.midterm_start_date ?? "");
  const [midtermEnd, setMidtermEnd] = useState(term?.midterm_end_date ?? "");
  const [finalStart, setFinalStart] = useState(term?.final_start_date ?? "");
  const [finalEnd, setFinalEnd] = useState(term?.final_end_date ?? "");
  const [status] = useState<AcademicTermStatus>(term?.status ?? "draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!startDate || !endDate) {
      setError("กรุณากรอกวันเปิดและวันสิ้นสุดภาคการศึกษา");
      return;
    }
    const pairedDates = [
      [midtermStart, midtermEnd],
      [finalStart, finalEnd],
    ];
    if (pairedDates.some(([start, end]) => Boolean(start) !== Boolean(end))) {
      setError("ช่วงสอบต้องกรอกวันเริ่มและวันสิ้นสุดให้ครบทั้งคู่");
      return;
    }

    const examDates = [midtermStart, midtermEnd, finalStart, finalEnd].filter(Boolean);
    if (examDates.some((date) => date < startDate || date > endDate)) {
      setError("ช่วงวันสอบต้องอยู่ภายในวันเปิดและวันสิ้นสุดภาคการศึกษา");
      return;
    }
    if (midtermEnd && finalStart && midtermEnd >= finalStart) {
      setError("ช่วงสอบกลางภาคต้องสิ้นสุดก่อนช่วงสอบปลายภาค");
      return;
    }

    const payload: SaveAcademicTermPayload = {
      academic_year: Number(academicYear),
      semester_no: Number(semesterNo),
      start_date: startDate,
      end_date: endDate,
      midterm_start_date: midtermStart || null,
      midterm_end_date: midtermEnd || null,
      final_start_date: finalStart || null,
      final_end_date: finalEnd || null,
      status,
    };

    setSaving(true);
    setError("");
    try {
      if (term) {
        await teachingManagementService.updateAcademicTerm(term.academic_term_id, payload);
        await onSaved(`แก้ไขปีการศึกษา ${academicYear} ภาคเรียนที่ ${semesterNo} แล้ว`);
      } else {
        await teachingManagementService.createAcademicTerm(payload);
        await onSaved(`สร้างปีการศึกษา ${academicYear} ภาคเรียนที่ ${semesterNo} แล้ว`);
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "ไม่สามารถสร้างภาคการศึกษาได้",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#243b45]/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="term-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(28,54,65,0.25)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#5794aa]">
              Academic Term
            </p>
            <h2 id="term-modal-title" className="mt-1 text-xl font-semibold text-[#304852]">
              {term ? "แก้ไขภาคการศึกษา" : "เพิ่มภาคการศึกษา"}
            </h2>
            <p className="mt-1 text-sm text-[#7d9098]">
              {term
                ? "ปรับวันเรียน ช่วงสอบ และสถานะ โดยข้อมูลกลุ่มเรียนเดิมยังคงอยู่"
                : "สร้างรอบการศึกษาก่อนเปิดกลุ่มเรียนและมอบหมายผู้สอน"}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="ปิด" className="rounded-full p-2 text-[#7d9098] transition hover:bg-[#edf4f6] disabled:opacity-50">
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-[#4c626c]">
            ปีการศึกษา
            <input value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} inputMode="numeric" className={dateInputClass} />
          </label>
          <label className="text-sm font-medium text-[#4c626c]">
            ภาคเรียน
            <AdminSelect
              value={semesterNo}
              onChange={setSemesterNo}
              options={[
                { value: "1", label: "ภาคเรียนที่ 1" },
                { value: "2", label: "ภาคเรียนที่ 2" },
                { value: "3", label: "ภาคฤดูร้อน" },
              ]}
              ariaLabel="เลือกภาคเรียน"
              appearance="cute"
              icon={CalendarDays}
              className="mt-2"
            />
          </label>
          <label className="text-sm font-medium text-[#4c626c]">
            วันเปิดภาคเรียน
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={dateInputClass} />
          </label>
          <label className="text-sm font-medium text-[#4c626c]">
            วันสิ้นสุดภาคเรียน
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={dateInputClass} />
          </label>

          <div className="rounded-2xl border border-[#e1ebee] bg-[#f8fcfd] p-4 sm:col-span-2">
            <p className="text-sm font-medium text-[#4c626c]">ช่วงสอบ (ไม่บังคับ)</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="text-xs text-[#71858e]">เริ่มกลางภาค<input type="date" value={midtermStart} onChange={(event) => setMidtermStart(event.target.value)} className={dateInputClass} /></label>
              <label className="text-xs text-[#71858e]">สิ้นสุดกลางภาค<input type="date" value={midtermEnd} onChange={(event) => setMidtermEnd(event.target.value)} className={dateInputClass} /></label>
              <label className="text-xs text-[#71858e]">เริ่มปลายภาค<input type="date" value={finalStart} onChange={(event) => setFinalStart(event.target.value)} className={dateInputClass} /></label>
              <label className="text-xs text-[#71858e]">สิ้นสุดปลายภาค<input type="date" value={finalEnd} onChange={(event) => setFinalEnd(event.target.value)} className={dateInputClass} /></label>
            </div>
          </div>

          <div className="rounded-2xl border border-[#dbe8ec] bg-[#f7fbfc] px-4 py-3 text-sm text-[#58717b] sm:col-span-2">
            <span className="font-medium">สถานะ: {termStatusLabel[status]}</span>
            <p className="mt-1 text-xs text-[#82939a]">
              {term
                ? "เปลี่ยนสถานะจากหน้าตรวจสอบความพร้อม เพื่อไม่ให้ข้ามขั้นตอน"
                : "ภาคการศึกษาใหม่จะถูกบันทึกเป็นฉบับร่างโดยอัตโนมัติ"}
            </p>
          </div>

          {error && <p role="alert" className="rounded-xl bg-[#fff0ec] px-3.5 py-3 text-sm text-[#a9503c] sm:col-span-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm text-[#687b84] transition hover:bg-[#eef4f6] disabled:opacity-50">ยกเลิก</button>
            <button type="submit" disabled={saving} className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-[#5794aa] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#477f93] disabled:opacity-60">
              {saving ? <LoaderCircle className="animate-spin" size={17} /> : <CalendarPlus size={17} />}
              {saving ? "กำลังบันทึก" : term ? "บันทึกการแก้ไข" : "สร้างภาคการศึกษา"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface SectionModalProps {
  section: TeachingCourseSection | null;
  terms: TeachingAcademicTerm[];
  subjects: TeachingSubject[];
  instructors: TeachingInstructor[];
  curriculumSubjects: TeachingCurriculumSubject[];
  defaultTermId?: number | null;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}

function SectionModal({
  section,
  terms,
  subjects,
  instructors,
  curriculumSubjects,
  defaultTermId,
  onClose,
  onSaved,
}: SectionModalProps) {
  const owner = section?.instructors.find((item) => item.instructor_role === "owner");
  const initialCoInstructorIds =
    section?.instructors
      .filter((item) => item.instructor_role === "co_instructor")
      .map((item) => String(item.instructor_id)) ?? [];
  const [subjectId, setSubjectId] = useState(section?.subject_id ?? "");
  const [termId, setTermId] = useState(
    section
      ? String(section.academic_term_id)
      : defaultTermId
        ? String(defaultTermId)
        : "",
  );
  const [sectionNumber, setSectionNumber] = useState(section?.section_number ?? "");
  const [capacity, setCapacity] = useState(
    section?.capacity === null || section?.capacity === undefined
      ? ""
      : String(section.capacity),
  );
  const defaultTerm = terms.find(
    (term) => term.academic_term_id === (section?.academic_term_id ?? defaultTermId),
  );
  const [status, setStatus] = useState<CourseSectionStatus>(
    section?.status ?? (defaultTerm?.status === "active" ? "open" : "draft"),
  );
  const [ownerId, setOwnerId] = useState(owner ? String(owner.instructor_id) : "");
  const [coInstructorIds, setCoInstructorIds] = useState(initialCoInstructorIds);
  const [curriculumSubjectIds, setCurriculumSubjectIds] = useState<number[]>(
    section?.curriculum_subject_ids ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedTerm = terms.find(
    (term) => term.academic_term_id === Number(termId),
  );
  const eligibleCurricula = curriculumSubjects.filter(
    (curriculum) =>
      curriculum.subject_id === subjectId &&
      curriculum.semester_no === selectedTerm?.semester_no,
  );
  const selectedCurricula = eligibleCurricula.filter((curriculum) =>
    curriculumSubjectIds.includes(curriculum.curriculum_subject_id),
  );
  const eligibleDepartmentIds = new Set(
    selectedCurricula.map((curriculum) => curriculum.department_id),
  );
  const eligibleInstructors = instructors.filter((instructor) =>
    eligibleDepartmentIds.has(instructor.department_id),
  );
  const coInstructorOptions = eligibleInstructors.filter(
    (instructor) =>
      String(instructor.admin_id) !== ownerId &&
      !coInstructorIds.includes(String(instructor.admin_id)),
  );
  const selectedCoInstructors = eligibleInstructors.filter((instructor) =>
    coInstructorIds.includes(String(instructor.admin_id)),
  );
  const instructorLabel = (instructor: TeachingInstructor) =>
    `${instructor.first_name} ${instructor.last_name}`.trim() || instructor.admin_name;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !subjectId ||
      !termId ||
      !sectionNumber.trim() ||
      curriculumSubjectIds.length === 0
    ) {
      setError("กรุณาเลือกวิชา กลุ่มเรียน และสาขา/ชั้นปีให้ครบ");
      return;
    }
    const payload: SaveCourseSectionPayload = {
      subject_id: subjectId,
      academic_term_id: Number(termId),
      section_number: sectionNumber.trim(),
      capacity: capacity ? Number(capacity) : null,
      status,
      owner_instructor_id: ownerId ? Number(ownerId) : null,
      co_instructor_ids: coInstructorIds.map(Number),
      curriculum_subject_ids: curriculumSubjectIds,
    };

    setSaving(true);
    setError("");
    try {
      if (section) {
        await teachingManagementService.updateCourseSection(section.section_id, payload);
        await onSaved(`แก้ไข ${subjectId} กลุ่ม ${sectionNumber.trim()} แล้ว`);
      } else {
        await teachingManagementService.createCourseSection(payload);
        await onSaved(`เปิดสอน ${subjectId} กลุ่ม ${sectionNumber.trim()} แล้ว`);
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "ไม่สามารถบันทึกกลุ่มเรียนได้",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#243b45]/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="section-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(28,54,65,0.25)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#7468a8]">
              Course Section
            </p>
            <h2 id="section-modal-title" className="mt-1 text-xl font-semibold text-[#304852]">
              {section ? "แก้ไขข้อมูล Section" : "เพิ่มวิชาและ Section"}
            </h2>
            <p className="mt-1 text-sm text-[#7d9098]">
              เลือกวิชาและกลุ่มผู้เรียน ส่วนอาจารย์สามารถกำหนดต่อในขั้นถัดไป
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="ปิด" className="rounded-full p-2 text-[#7d9098] transition hover:bg-[#edf4f6] disabled:opacity-50"><X size={19} /></button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-[#4c626c] sm:col-span-2">
            วิชา
            <AdminSelect
              value={subjectId}
              onChange={(value) => {
                setSubjectId(value);
                setOwnerId("");
                setCoInstructorIds([]);
                setCurriculumSubjectIds([]);
                setError("");
              }}
              options={subjects.map((subject) => ({ value: subject.subject_id, label: `${subject.subject_id} · ${subject.subject_name}` }))}
              ariaLabel="เลือกวิชา"
              placeholder="เลือกวิชา"
              appearance="cute"
              icon={BookOpen}
              className="mt-2"
            />
          </label>
          <label className="text-sm font-medium text-[#4c626c]">
            ภาคการศึกษา
            <AdminSelect
              value={termId}
              onChange={(value) => {
                setTermId(value);
                const nextTerm = terms.find(
                  (term) => term.academic_term_id === Number(value),
                );
                setStatus(nextTerm?.status === "active" ? "open" : "draft");
                setCurriculumSubjectIds([]);
                setOwnerId("");
                setCoInstructorIds([]);
                setError("");
              }}
              options={terms.filter((term) => term.status === "draft" || term.status === "active").map((term) => ({ value: String(term.academic_term_id), label: `ปี ${term.academic_year} · ภาคเรียน ${term.semester_no}`, description: termStatusLabel[term.status] }))}
              ariaLabel="เลือกภาคการศึกษา"
              placeholder="เลือกภาคการศึกษา"
              appearance="cute"
              icon={CalendarDays}
              className="mt-2"
              disabled={!section && Boolean(defaultTermId)}
            />
            {!section && defaultTermId && (
              <span className="mt-1 block text-[11px] font-normal text-[#96a4aa]">
                ใช้ภาคการศึกษาที่เลือกไว้จากหน้าหลักโดยอัตโนมัติ
              </span>
            )}
          </label>

          <div className="rounded-2xl border border-[#dce9ee] bg-[#f8fcfd] p-4 sm:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[#4f879c]">
                  <GraduationCap size={18} />
                  <p className="text-sm font-medium">สาขาและชั้นปีที่ลงเรียนได้</p>
                </div>
                <p className="mt-1 text-xs text-[#82939a]">
                  เลือกได้หลายรายการ หาก Section นี้ใช้เรียนร่วมกันหลายสาขา
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs text-[#5c8797] shadow-sm">
                เลือกแล้ว {curriculumSubjectIds.length}
              </span>
            </div>
            {!subjectId || !termId ? (
              <p className="mt-3 rounded-xl border border-dashed border-[#d4e3e7] bg-white px-3 py-4 text-center text-xs text-[#8a999f]">
                เลือกวิชาและภาคการศึกษาก่อน
              </p>
            ) : eligibleCurricula.length === 0 ? (
              <p className="mt-3 rounded-xl border border-[#f0d8ce] bg-[#fff8f5] px-3 py-4 text-center text-xs text-[#a36a56]">
                วิชานี้ยังไม่ได้อยู่ในแผนการเรียนของภาคเรียนที่เลือก กรุณาเพิ่มในหน้า “รายวิชาและหลักสูตร” ก่อน
              </p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {eligibleCurricula.map((curriculum) => {
                  const checked = curriculumSubjectIds.includes(
                    curriculum.curriculum_subject_id,
                  );
                  return (
                    <label
                      key={curriculum.curriculum_subject_id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition ${checked ? "border-[#9ccbd9] bg-[#eaf7fa]" : "border-[#dce7ea] bg-white hover:border-[#bdd9e2]"}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          setCurriculumSubjectIds((current) =>
                            event.target.checked
                              ? [...current, curriculum.curriculum_subject_id]
                              : current.filter(
                                  (id) => id !== curriculum.curriculum_subject_id,
                                ),
                          );
                          setOwnerId("");
                          setCoInstructorIds([]);
                          setError("");
                        }}
                        className="mt-0.5 size-4 accent-[#5794aa]"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[#405862]">
                          {curriculum.department_name}
                        </span>
                        <span className="mt-0.5 block text-xs text-[#82939a]">
                          {curriculum.faculty_name} · ชั้นปี {curriculum.year_level}
                          {curriculum.is_required ? " · วิชาบังคับ" : " · วิชาเลือก"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <label className="text-sm font-medium text-[#4c626c]">
            หมายเลขกลุ่มเรียน
            <input value={sectionNumber} onChange={(event) => setSectionNumber(event.target.value)} maxLength={20} placeholder="เช่น 1 หรือ 001" className={dateInputClass} />
          </label>
          <label className="text-sm font-medium text-[#4c626c]">
            จำนวนรับ (ไม่บังคับ)
            <input value={capacity} onChange={(event) => setCapacity(event.target.value)} inputMode="numeric" placeholder="เช่น 40" className={dateInputClass} />
          </label>
          <label className="text-sm font-medium text-[#4c626c]">
            สถานะกลุ่มเรียน
            <AdminSelect
              value={status}
              onChange={(value) => setStatus(value as CourseSectionStatus)}
              options={sectionStatusOptions.filter((option) =>
                selectedTerm?.status === "draft"
                  ? option.value === "draft" || option.value === "cancelled"
                  : true,
              )}
              ariaLabel="เลือกสถานะกลุ่มเรียน"
              appearance="cute"
              icon={DoorOpen}
              className="mt-2"
            />
          </label>

          <div className="rounded-2xl border border-[#e2e5f0] bg-[#faf9fe] p-4 sm:col-span-2">
            <div className="flex items-center gap-2 text-[#62578f]"><GraduationCap size={18} /><p className="text-sm font-medium">อาจารย์ผู้สอน <span className="font-normal text-[#8b83ad]">(กำหนดภายหลังได้)</span></p></div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-[#4c626c]">
                อาจารย์เจ้าของวิชา
                <AdminSelect
                  value={ownerId}
                  onChange={(value) => { setOwnerId(value); setCoInstructorIds((current) => current.filter((id) => id !== value)); setError(""); }}
                  options={eligibleInstructors.map((instructor) => ({ value: String(instructor.admin_id), label: instructorLabel(instructor), description: instructor.department_name }))}
                  ariaLabel="เลือกอาจารย์เจ้าของวิชา"
                  placeholder={!curriculumSubjectIds.length ? "เลือกสาขาและชั้นปีก่อน" : eligibleInstructors.length ? "เลือกอาจารย์" : "ยังไม่มีอาจารย์ในสาขาที่เลือก"}
                  appearance="cute"
                  icon={UserRound}
                  className="mt-2"
                  disabled={!curriculumSubjectIds.length || eligibleInstructors.length === 0}
                />
              </label>
              <label className="text-sm font-medium text-[#4c626c]">
                ผู้สอนร่วม (ไม่บังคับ)
                <AdminSelect
                  value=""
                  onChange={(value) => {
                    if (value) setCoInstructorIds((current) => [...current, value]);
                    setError("");
                  }}
                  options={coInstructorOptions.map((instructor) => ({ value: String(instructor.admin_id), label: instructorLabel(instructor), description: instructor.department_name }))}
                  ariaLabel="เลือกอาจารย์ผู้สอนร่วม"
                  placeholder={coInstructorOptions.length ? "เพิ่มผู้สอนร่วม" : "ไม่มีอาจารย์ให้เลือกเพิ่ม"}
                  appearance="cute"
                  icon={UsersRound}
                  className="mt-2"
                  disabled={!ownerId || coInstructorOptions.length === 0}
                />
                {selectedCoInstructors.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedCoInstructors.map((instructor) => (
                      <span key={instructor.admin_id} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs text-[#665a98] shadow-sm">
                        {instructorLabel(instructor)}
                        <button
                          type="button"
                          onClick={() => setCoInstructorIds((current) => current.filter((id) => id !== String(instructor.admin_id)))}
                          aria-label={`นำ ${instructorLabel(instructor)} ออกจากผู้สอนร่วม`}
                          className="rounded-full p-0.5 transition hover:bg-[#eeeaf8]"
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </label>
            </div>
          </div>

          {error && <p role="alert" className="rounded-xl bg-[#fff0ec] px-3.5 py-3 text-sm text-[#a9503c] sm:col-span-2">{error}</p>}
          <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm text-[#687b84] transition hover:bg-[#eef4f6] disabled:opacity-50">ยกเลิก</button>
            <button type="submit" disabled={saving} className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-[#7468a8] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#655a98] disabled:opacity-60">
              {saving ? <LoaderCircle className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}
              {saving ? "กำลังบันทึก" : section ? "บันทึกการแก้ไข" : "บันทึก Section ฉบับร่าง"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeachingManagementClient() {
  const [workspace, setWorkspace] = useState<TeachingWorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [activeStep, setActiveStep] = useState<TeachingFlowStep>("terms");
  const [termFilter, setTermFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [facultyFilter, setFacultyFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<TeachingAcademicTerm | null>(null);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<TeachingCourseSection | null>(null);
  const [meetingEditor, setMeetingEditor] = useState<{
    section: TeachingCourseSection;
    meeting: TeachingClassMeeting | null;
  } | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [termStatusUpdatingId, setTermStatusUpdatingId] = useState<number | null>(null);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await teachingManagementService.getWorkspace();
      setWorkspace(response);
      setTermFilter((current) => current || preferredTermId(response));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดข้อมูลการเปิดสอนได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    teachingManagementService
      .getWorkspace()
      .then((response) => {
        if (active) {
          setWorkspace(response);
          setTermFilter((current) => current || preferredTermId(response));
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดข้อมูลการเปิดสอนได้");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const sections = useMemo(() => workspace?.sections ?? [], [workspace]);
  const curricula = useMemo(
    () => workspace?.curriculum_subjects ?? [],
    [workspace],
  );
  const selectedTerm = workspace?.academic_terms.find(
    (term) => term.academic_term_id === Number(termFilter),
  );
  const facultyOptions = useMemo(
    () =>
      [...new Map(
        curricula.map((curriculum) => [
          curriculum.faculty_id,
          { id: curriculum.faculty_id, name: curriculum.faculty_name },
        ]),
      ).values()].sort((first, second) => first.name.localeCompare(second.name, "th")),
    [curricula],
  );
  const departmentOptions = useMemo(
    () =>
      [...new Map(
        curricula
          .filter(
            (curriculum) =>
              facultyFilter === "all" ||
              curriculum.faculty_id === Number(facultyFilter),
          )
          .map((curriculum) => [
            curriculum.department_id,
            { id: curriculum.department_id, name: curriculum.department_name },
          ]),
      ).values()].sort((first, second) => first.name.localeCompare(second.name, "th")),
    [curricula, facultyFilter],
  );
  const filteredSections = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("th");
    return sections.filter((section) => {
      const instructorNames = section.instructors
        .map((instructor) => `${instructor.first_name} ${instructor.last_name} ${instructor.admin_name}`)
        .join(" ")
        .toLocaleLowerCase("th");
      const sectionCurricula = curricula.filter((curriculum) =>
        section.curriculum_subject_ids.includes(curriculum.curriculum_subject_id),
      );
      return (
        (!termFilter || section.academic_term_id === Number(termFilter)) &&
        (statusFilter === "all" || section.status === statusFilter) &&
        (facultyFilter === "all" ||
          sectionCurricula.some(
            (curriculum) => curriculum.faculty_id === Number(facultyFilter),
          )) &&
        (departmentFilter === "all" ||
          sectionCurricula.some(
            (curriculum) => curriculum.department_id === Number(departmentFilter),
          )) &&
        (yearFilter === "all" ||
          sectionCurricula.some(
            (curriculum) => curriculum.year_level === Number(yearFilter),
          )) &&
        (!query ||
          section.subject_id.toLocaleLowerCase().includes(query) ||
          section.subject_name.toLocaleLowerCase().includes(query) ||
          section.section_number.toLocaleLowerCase().includes(query) ||
          instructorNames.includes(query))
      );
    });
  }, [curricula, departmentFilter, facultyFilter, search, sections, statusFilter, termFilter, yearFilter]);

  const handleSaved = async (message: string) => {
    setTermModalOpen(false);
    setEditingTerm(null);
    setSectionModalOpen(false);
    setEditingSection(null);
    setNotice(message);
    await loadWorkspace();
  };

  const handleTermStatus = async (term: TeachingAcademicTerm) => {
    const next = nextTermStatus[term.status];
    if (
      (next.status === "completed" || next.status === "archived") &&
      !window.confirm(
        `${next.label} ปี ${term.academic_year} ภาคเรียนที่ ${term.semester_no} หรือไม่? ข้อมูลกลุ่มเรียนจะยังคงอยู่`,
      )
    ) {
      return;
    }
    setTermStatusUpdatingId(term.academic_term_id);
    setError("");
    try {
      await teachingManagementService.updateAcademicTermStatus(
        term.academic_term_id,
        next.status,
      );
      setNotice(
        `${next.label} ปี ${term.academic_year} ภาคเรียนที่ ${term.semester_no} แล้ว`,
      );
      await loadWorkspace();
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "ไม่สามารถเปลี่ยนสถานะภาคการศึกษาได้",
      );
    } finally {
      setTermStatusUpdatingId(null);
    }
  };

  const handleMeetingSaved = async (message: string) => {
    setMeetingEditor(null);
    setNotice(message);
    await loadWorkspace();
  };

  const handleQuickStatus = async (section: TeachingCourseSection) => {
    const nextStatus: CourseSectionStatus = section.status === "open" ? "closed" : "open";
    setStatusUpdatingId(section.section_id);
    setError("");
    try {
      await teachingManagementService.updateCourseSectionStatus(section.section_id, nextStatus);
      setNotice(`${nextStatus === "open" ? "เปิด" : "ปิด"}กลุ่ม ${section.subject_id}-${section.section_number} แล้ว`);
      await loadWorkspace();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "ไม่สามารถเปลี่ยนสถานะกลุ่มเรียนได้");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const activeTermCount = workspace?.academic_terms.filter((term) => term.status === "active").length ?? 0;
  const openSectionCount = sections.filter((section) => section.status === "open").length;
  const assignedInstructorCount = new Set(
    sections.flatMap((section) => section.instructors.map((instructor) => instructor.instructor_id)),
  ).size;
  const selectedTermSections = sections.filter(
    (section) => section.academic_term_id === selectedTerm?.academic_term_id,
  );
  const sectionReadiness = selectedTermSections.map((section) => {
    const hasCurriculum = section.curriculum_subject_ids.length > 0;
    const hasOwner = section.instructors.some(
      (instructor) => instructor.instructor_role === "owner",
    );
    const hasMeeting = section.meetings.length > 0;
    const meetingsHaveRooms =
      hasMeeting && section.meetings.every((meeting) => Boolean(meeting.classroom?.trim()));
    return {
      section,
      hasCurriculum,
      hasOwner,
      hasMeeting,
      meetingsHaveRooms,
      ready: hasCurriculum && hasOwner && hasMeeting && meetingsHaveRooms,
    };
  });
  const readySectionCount = sectionReadiness.filter((item) => item.ready).length;
  const selectedTermReady =
    selectedTermSections.length > 0 && readySectionCount === selectedTermSections.length;

  return (
    <>
      <section className="rounded-[28px] border border-[#dcebf0] bg-[linear-gradient(135deg,#ffffff_0%,#eef8fb_100%)] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#e4f4f9] px-3 py-1.5 text-xs font-medium text-[#4d879c]"><GraduationCap size={15} /> Academic Setup</div>
            <h1 className="mt-4 text-2xl font-semibold text-[#304b56] sm:text-3xl">เตรียมการเปิดสอนตามลำดับ</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71858e]">เลือกภาคการศึกษาครั้งเดียว แล้วจัดวิชา Section กลุ่มผู้เรียน อาจารย์ และตารางเรียนต่อเนื่องโดยไม่กรอกข้อมูลเดิมซ้ำ</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeStep === "terms" ? (
              <button type="button" onClick={() => { setEditingTerm(null); setTermModalOpen(true); }} className="inline-flex h-11 items-center gap-2 rounded-full border border-[#bddce7] bg-white px-4 text-sm font-medium text-[#477f93] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><CalendarPlus size={17} /> เพิ่มภาคการศึกษา</button>
            ) : (
              <button type="button" onClick={() => { setEditingSection(null); setSectionModalOpen(true); }} disabled={!selectedTerm || !workspace?.subjects.length || !workspace.instructors.length} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#7468a8] px-5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#655a98] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45"><Plus size={17} /> เพิ่มวิชาและ Section</button>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-[24px] border border-[#dfeaec] bg-white p-2 shadow-sm">
        <div className="grid gap-2 md:grid-cols-4" role="tablist" aria-label="ขั้นตอนเตรียมการเปิดสอน">
          {teachingFlowSteps.map((step) => {
            const Icon = step.icon;
            const active = activeStep === step.value;
            return (
              <button
                key={step.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveStep(step.value)}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${active ? "bg-[#eaf6fa] text-[#3f7e95] shadow-sm" : "text-[#687d86] hover:bg-[#f5f9fa]"}`}
              >
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${active ? "bg-white" : "bg-[#f1f5f6]"}`}><Icon size={18} /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{step.label}</span>
                  <span className="mt-0.5 block truncate text-[11px] opacity-75">{step.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "ภาคการศึกษาที่ใช้งาน", value: activeTermCount, icon: CalendarDays, color: "bg-[#e6f5fa] text-[#4b8ca3]" },
          { label: "กลุ่มเรียนที่เปิด", value: openSectionCount, icon: DoorOpen, color: "bg-[#e9f8ef] text-[#4b8b65]" },
          { label: "อาจารย์ที่ได้รับมอบหมาย", value: assignedInstructorCount, icon: UsersRound, color: "bg-[#f0eef9] text-[#7468a8]" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-[22px] border border-[#dfeaec] bg-white p-5 shadow-sm">
            <div className={`inline-flex rounded-2xl p-3 ${color}`}><Icon size={20} /></div>
            <p className="mt-4 text-2xl font-semibold text-[#304b56]">{value}</p>
            <p className="mt-1 text-sm text-[#7b8d95]">{label}</p>
          </div>
        ))}
      </section>

      {activeStep === "terms" && (
      <section className="mt-6 rounded-[26px] border border-[#dfeaec] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#4f879c]">Academic Terms</p>
            <h2 className="mt-1 text-xl font-semibold text-[#304b56]">ภาคการศึกษาและประวัติย้อนหลัง</h2>
            <p className="mt-1 text-sm text-[#82939a]">แก้ไขช่วงวัน เปลี่ยนสถานะ และเปิดดูกลุ่มเรียนของแต่ละเทอม</p>
          </div>
          <span className="w-fit rounded-full bg-[#eaf6fa] px-3 py-1.5 text-xs font-medium text-[#4f879c]">
            {workspace?.academic_terms.length ?? 0} ภาคการศึกษา
          </span>
        </div>

        {loading ? (
          <div className="mt-5 flex min-h-36 items-center justify-center gap-2 text-sm text-[#71858e]">
            <LoaderCircle className="animate-spin" size={20} /> กำลังโหลดภาคการศึกษา...
          </div>
        ) : !workspace?.academic_terms.length ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[#cddfe5] bg-[#fafcfd] px-5 py-10 text-center text-sm text-[#82939a]">
            ยังไม่มีภาคการศึกษา กด “เพิ่มภาคการศึกษา” เพื่อเริ่มต้น
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {workspace.academic_terms.map((term) => {
              const sectionCount = sections.filter(
                (section) => section.academic_term_id === term.academic_term_id,
              ).length;
              return (
                <article
                  key={term.academic_term_id}
                  className="rounded-[22px] border border-[#dfeaec] bg-[#fbfdfe] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-[#6f9bab]">ปีการศึกษา</p>
                      <h3 className="mt-1 text-lg font-semibold text-[#304b56]">
                        {term.academic_year} · ภาคเรียนที่ {term.semester_no}
                      </h3>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${termStatusStyles[term.status]}`}>
                      {termStatusLabel[term.status]}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-2xl bg-white p-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-[#8b9aa0]">ช่วงเปิดภาคเรียน</p>
                      <p className="mt-1 text-[#506872]">{formatTermDate(term.start_date)} – {formatTermDate(term.end_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#8b9aa0]">กลุ่มเรียน</p>
                      <p className="mt-1 text-[#506872]">{sectionCount} กลุ่ม</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#8b9aa0]">สอบกลางภาค</p>
                      <p className="mt-1 text-[#506872]">{term.midterm_start_date ? `${formatTermDate(term.midterm_start_date)} – ${formatTermDate(term.midterm_end_date)}` : "ยังไม่กำหนด"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#8b9aa0]">สอบปลายภาค</p>
                      <p className="mt-1 text-[#506872]">{term.final_start_date ? `${formatTermDate(term.final_start_date)} – ${formatTermDate(term.final_end_date)}` : "ยังไม่กำหนด"}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTermFilter(String(term.academic_term_id));
                        setStatusFilter("all");
                        setActiveStep("sections");
                      }}
                      className="rounded-xl border border-[#d6e3e7] px-3.5 py-2 text-xs font-medium text-[#607983] transition hover:bg-white"
                    >
                      เลือกและทำขั้นตอนต่อไป
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingTerm(term); setTermModalOpen(true); }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#eef4f7] px-3.5 py-2 text-xs font-medium text-[#4f7f91] transition hover:bg-[#e1edf2]"
                    >
                      <Pencil size={14} /> แก้ไข
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      )}

      {(activeStep === "sections" || activeStep === "schedule") && (
      <section className="mt-6 rounded-[26px] border border-[#dfeaec] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#405862]">ตัวกรองรายการเปิดสอน</p>
            <p className="mt-0.5 text-xs text-[#82939a]">กรองตามคณะ สาขา ชั้นปี และเทอม เพื่อค้นหาและตรวจสอบได้เร็วขึ้น</p>
          </div>
          {selectedTerm && <span className="w-fit rounded-full bg-[#eaf6fa] px-3 py-1.5 text-xs font-medium text-[#4f879c]">ปี {selectedTerm.academic_year} · เทอม {selectedTerm.semester_no}</span>}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="relative block">
            <span className="sr-only">ค้นหา</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7f969f]" size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาวิชา กลุ่มเรียน หรือชื่ออาจารย์" className="h-12 w-full rounded-2xl border border-[#d5e3e7] bg-[#fbfdfe] pl-11 pr-4 text-sm text-[#405862] outline-none transition focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]" />
          </label>
          <AdminSelect
            value={termFilter}
            onChange={setTermFilter}
            options={[
              ...(workspace?.academic_terms.map((term) => ({ value: String(term.academic_term_id), label: `ปี ${term.academic_year} · เทอม ${term.semester_no}` })) ?? []),
            ]}
            ariaLabel="กรองภาคการศึกษา"
            appearance="cute"
            icon={CalendarDays}
          />
          <AdminSelect
            value={facultyFilter}
            onChange={(value) => {
              setFacultyFilter(value);
              setDepartmentFilter("all");
            }}
            options={[
              { value: "all", label: "ทุกคณะ" },
              ...facultyOptions.map((faculty) => ({ value: String(faculty.id), label: faculty.name })),
            ]}
            ariaLabel="กรองคณะ"
            appearance="cute"
            icon={Building2}
          />
          <AdminSelect
            value={departmentFilter}
            onChange={setDepartmentFilter}
            options={[
              { value: "all", label: "ทุกสาขา" },
              ...departmentOptions.map((department) => ({ value: String(department.id), label: department.name })),
            ]}
            ariaLabel="กรองสาขา"
            appearance="cute"
            icon={Layers3}
          />
          <AdminSelect
            value={yearFilter}
            onChange={setYearFilter}
            options={[
              { value: "all", label: "ทุกชั้นปี" },
              ...Array.from({ length: 8 }, (_, index) => ({ value: String(index + 1), label: `ชั้นปี ${index + 1}` })),
            ]}
            ariaLabel="กรองชั้นปี"
            appearance="cute"
            icon={GraduationCap}
          />
          <AdminSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[{ value: "all", label: "ทุกสถานะ" }, ...sectionStatusOptions]}
            ariaLabel="กรองสถานะกลุ่มเรียน"
            appearance="cute"
            icon={DoorOpen}
          />
        </div>
      </section>
      )}

      {notice && (
        <div role="status" className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[#cce9dc] bg-[#f0fbf6] px-4 py-3 text-sm text-[#39785f]">
          <span className="flex items-center gap-2"><CheckCircle2 size={17} />{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="ปิดข้อความ"><X size={17} /></button>
        </div>
      )}
      {error && (
        <div role="alert" className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[#efcfca] bg-[#fff5f2] px-4 py-3 text-sm text-[#a85c49]">
          <span className="flex items-center gap-2"><AlertCircle size={17} />{error}</span>
          <button type="button" onClick={() => void loadWorkspace()} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs shadow-sm"><RefreshCw size={14} /> ลองใหม่</button>
        </div>
      )}

      {(activeStep === "sections" || activeStep === "schedule") && (
      <section className="mt-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#4f879c]">{activeStep === "sections" ? "Courses & Sections" : "Teaching Schedule"}</p>
            <h2 className="mt-1 text-xl font-semibold text-[#304b56]">{activeStep === "sections" ? "วิชาและกลุ่มเรียนในเทอมที่เลือก" : "อาจารย์ผู้สอนและตารางเรียน"}</h2>
          </div>
          <span className="rounded-full bg-[#eaf6fa] px-3 py-1.5 text-xs font-medium text-[#4f879c]">{filteredSections.length} กลุ่ม</span>
        </div>

        {loading ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-[26px] border border-[#dfeaec] bg-white text-[#66808b]"><LoaderCircle className="animate-spin text-[#559ab3]" size={30} /><p className="text-sm">กำลังโหลดข้อมูลการเปิดสอน...</p></div>
        ) : filteredSections.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-[26px] border border-dashed border-[#cddfe5] bg-white px-6 text-center">
            <span className="rounded-full bg-[#eef7fa] p-4 text-[#6a9daf]"><CircleOff size={28} /></span>
            <p className="mt-4 font-medium text-[#405862]">ยังไม่มีกลุ่มเรียนที่ตรงกับรายการนี้</p>
            <p className="mt-1 max-w-md text-sm text-[#82939a]">สร้างภาคการศึกษา แล้วกด “เปิดกลุ่มเรียน” เพื่อเชื่อมวิชากับอาจารย์ผู้สอน</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredSections.map((section) => {
              const owner = section.instructors.find((item) => item.instructor_role === "owner");
              const coInstructors = section.instructors.filter((item) => item.instructor_role === "co_instructor");
              const sectionCurricula = curricula.filter((curriculum) =>
                section.curriculum_subject_ids.includes(curriculum.curriculum_subject_id),
              );
              const canToggle = !["completed", "cancelled"].includes(section.status);
              return (
                <article key={section.section_id} className="rounded-[24px] border border-[#dfeaec] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="text-xs font-medium text-[#6f9bab]">{section.subject_id} · กลุ่ม {section.section_number}</p><h3 className="mt-1 truncate text-lg font-semibold text-[#304b56]">{section.subject_name}</h3></div>
                    <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${statusStyles[section.status]}`}>{statusLabel(section.status)}</span>
                  </div>
                  <div className="mt-4 grid gap-3 rounded-2xl bg-[#f7fbfc] p-4 sm:grid-cols-2">
                    <div className="flex gap-2.5"><CalendarDays className="mt-0.5 shrink-0 text-[#6f9bab]" size={17} /><div><p className="text-xs text-[#8b9aa0]">ภาคการศึกษา</p><p className="mt-0.5 text-sm text-[#506872]">ปี {section.academic_year} · เทอม {section.semester_no}</p></div></div>
                    <div className="flex gap-2.5"><UsersRound className="mt-0.5 shrink-0 text-[#7468a8]" size={17} /><div><p className="text-xs text-[#8b9aa0]">จำนวนรับ</p><p className="mt-0.5 text-sm text-[#506872]">{section.capacity ? `${section.capacity} คน` : "ไม่จำกัด"}</p></div></div>
                    <div className="flex gap-2.5 sm:col-span-2"><UserRound className="mt-0.5 shrink-0 text-[#5794aa]" size={17} /><div className="min-w-0"><p className="text-xs text-[#8b9aa0]">อาจารย์เจ้าของวิชา</p><p className="mt-0.5 truncate text-sm font-medium text-[#405862]">{owner ? `${owner.first_name} ${owner.last_name}`.trim() || owner.admin_name : "ยังไม่ได้มอบหมาย"}</p>{coInstructors.length > 0 && <p className="mt-1 text-xs text-[#7f9097]">ผู้สอนร่วม: {coInstructors.map((item) => `${item.first_name} ${item.last_name}`.trim() || item.admin_name).join(", ")}</p>}</div></div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sectionCurricula.length ? sectionCurricula.map((curriculum) => (
                      <span key={curriculum.curriculum_subject_id} className="rounded-full bg-[#eef7fa] px-3 py-1.5 text-[11px] text-[#527b8b]">
                        {curriculum.department_name} · ปี {curriculum.year_level}
                      </span>
                    )) : (
                      <span className="rounded-full bg-[#fff0ec] px-3 py-1.5 text-[11px] text-[#a65d4a]">ยังไม่กำหนดสาขาและชั้นปี</span>
                    )}
                  </div>
                  {activeStep === "schedule" && (
                  <div className="mt-4 rounded-2xl border border-[#e1ebee] bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-[#6f9bab]">Class Meetings</p>
                        <p className="mt-0.5 text-sm font-medium text-[#405862]">ตารางเรียนของกลุ่ม</p>
                      </div>
                      <button
                        type="button"
                        disabled={!canToggle || section.instructors.length === 0}
                        onClick={() => setMeetingEditor({ section, meeting: null })}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#eaf6fa] px-3 py-2 text-xs font-medium text-[#4f8791] transition hover:bg-[#dceff5] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Plus size={14} /> เพิ่มคาบเรียน
                      </button>
                    </div>
                    {section.meetings.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-[#d4e3e7] bg-[#fafcfd] px-3 py-4 text-center text-xs text-[#8a999f]">
                        ยังไม่ได้กำหนดวัน เวลา และห้องเรียน
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {section.meetings.map((meeting) => {
                          const meetingInstructor =
                            `${meeting.first_name} ${meeting.last_name}`.trim() ||
                            meeting.admin_name;
                          return (
                            <div
                              key={meeting.class_meeting_id}
                              className="flex items-center justify-between gap-3 rounded-xl bg-[#f6fafb] px-3 py-2.5"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-[#405862]">
                                  <span>ทุก{classMeetingDayLabels[meeting.day_of_week]}</span>
                                  <span className="inline-flex items-center gap-1 text-[#647d87]"><Clock3 size={13} />{meeting.start_time.slice(0, 5)}–{meeting.end_time.slice(0, 5)}</span>
                                  <span className="inline-flex items-center gap-1 text-[#647d87]"><MapPin size={13} />{meeting.classroom || "ไม่ระบุห้อง"}</span>
                                </div>
                                <p className="mt-1 truncate text-xs text-[#89999f]">ผู้สอน: {meetingInstructor}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setMeetingEditor({ section, meeting })}
                                aria-label={`แก้ไขคาบ ${classMeetingDayLabels[meeting.day_of_week]}`}
                                title="แก้ไขคาบเรียน"
                                className="shrink-0 rounded-xl bg-white p-2 text-[#7468a8] shadow-sm transition hover:bg-[#eeeaf8]"
                              >
                                <Pencil size={15} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  )}
                  <div className="mt-4 flex justify-end gap-2">
                    {canToggle && selectedTerm?.status === "active" && <button type="button" disabled={statusUpdatingId === section.section_id} onClick={() => void handleQuickStatus(section)} className="inline-flex items-center gap-2 rounded-xl border border-[#d6e3e7] px-3.5 py-2 text-xs font-medium text-[#607983] transition hover:bg-[#f2f8fa] disabled:opacity-50">{statusUpdatingId === section.section_id ? <LoaderCircle className="animate-spin" size={15} /> : section.status === "open" ? <CircleOff size={15} /> : <DoorOpen size={15} />}{section.status === "open" ? "ปิดรับ" : "เปิดสอน"}</button>}
                    <button type="button" onClick={() => { setEditingSection(section); setSectionModalOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-[#eef4f7] px-3.5 py-2 text-xs font-medium text-[#4f7f91] transition hover:bg-[#e1edf2]"><Pencil size={15} /> {activeStep === "schedule" ? (owner ? "แก้ไขผู้สอน" : "กำหนดผู้สอน") : "แก้ไข Section"}</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      )}

      {activeStep === "readiness" && (
        <section className="mt-6 space-y-5">
          <div className="rounded-[26px] border border-[#dfeaec] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-[#4f879c]">Readiness Check</p>
                <h2 className="mt-1 text-xl font-semibold text-[#304b56]">ตรวจสอบก่อนเปิดภาคการศึกษา</h2>
                <p className="mt-1 text-sm text-[#82939a]">ทุก Section ต้องมีสาขา/ชั้นปี อาจารย์เจ้าของวิชา และคาบเรียนที่ระบุห้องครบ</p>
              </div>
              <div className="w-full lg:w-72">
                <AdminSelect
                  value={termFilter}
                  onChange={setTermFilter}
                  options={workspace?.academic_terms.map((term) => ({
                    value: String(term.academic_term_id),
                    label: `ปี ${term.academic_year} · เทอม ${term.semester_no}`,
                    description: termStatusLabel[term.status],
                  })) ?? []}
                  ariaLabel="เลือกภาคการศึกษาที่ต้องการตรวจสอบ"
                  appearance="cute"
                  icon={CalendarDays}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#f7fbfc] p-4">
                <p className="text-xs text-[#82939a]">Section ทั้งหมด</p>
                <p className="mt-1 text-2xl font-semibold text-[#304b56]">{selectedTermSections.length}</p>
              </div>
              <div className="rounded-2xl bg-[#f0fbf6] p-4">
                <p className="text-xs text-[#5f8b76]">พร้อมเปิด</p>
                <p className="mt-1 text-2xl font-semibold text-[#39785f]">{readySectionCount}</p>
              </div>
              <div className="rounded-2xl bg-[#fff7f2] p-4">
                <p className="text-xs text-[#a27561]">ต้องแก้ไข</p>
                <p className="mt-1 text-2xl font-semibold text-[#a65d4a]">{selectedTermSections.length - readySectionCount}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {sectionReadiness.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-[24px] border border-dashed border-[#ccdfe6] bg-white px-5 text-center lg:col-span-2">
                <CircleOff size={28} className="text-[#6a9daf]" />
                <p className="mt-4 font-medium text-[#405862]">ยังไม่มี Section ในภาคการศึกษานี้</p>
                <button type="button" onClick={() => setActiveStep("sections")} className="mt-4 rounded-xl bg-[#eaf6fa] px-4 py-2 text-sm font-medium text-[#4f879c]">ไปเพิ่มวิชาและ Section</button>
              </div>
            ) : sectionReadiness.map(({ section, hasCurriculum, hasOwner, hasMeeting, meetingsHaveRooms, ready }) => (
              <article key={section.section_id} className={`rounded-[24px] border bg-white p-5 shadow-sm ${ready ? "border-[#cce9dc]" : "border-[#efd9d2]"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-[#6f9bab]">{section.subject_id} · กลุ่ม {section.section_number}</p>
                    <h3 className="mt-1 font-semibold text-[#304b56]">{section.subject_name}</h3>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${ready ? "bg-[#e8f8ef] text-[#3c7b59]" : "bg-[#fff0ec] text-[#a65d4a]"}`}>{ready ? "พร้อม" : "ยังไม่พร้อม"}</span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {[
                    [hasCurriculum, "กำหนดสาขาและชั้นปี"],
                    [hasOwner, "มีอาจารย์เจ้าของวิชา"],
                    [hasMeeting, "มีวันและเวลาเรียน"],
                    [meetingsHaveRooms, "ระบุห้องเรียนครบ"],
                  ].map(([passed, label]) => (
                    <div key={String(label)} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs ${passed ? "bg-[#f0fbf6] text-[#39785f]" : "bg-[#fff5f2] text-[#a65d4a]"}`}>
                      {passed ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                      <span>{String(label)}</span>
                    </div>
                  ))}
                </div>
                {!ready && (
                  <button type="button" onClick={() => { setEditingSection(section); setSectionModalOpen(true); }} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#eef4f7] px-3.5 py-2 text-xs font-medium text-[#4f7f91]"><Pencil size={14} /> แก้ไข Section</button>
                )}
              </article>
            ))}
          </div>

          {selectedTerm && (
            <div className="flex flex-col gap-3 rounded-[24px] border border-[#dfeaec] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-[#405862]">ปี {selectedTerm.academic_year} · ภาคเรียนที่ {selectedTerm.semester_no}</p>
                <p className="mt-1 text-sm text-[#82939a]">สถานะปัจจุบัน: {termStatusLabel[selectedTerm.status]}</p>
              </div>
              {selectedTerm.status === "draft" ? (
                <button
                  type="button"
                  disabled={!selectedTermReady || termStatusUpdatingId === selectedTerm.academic_term_id}
                  onClick={() => void handleTermStatus(selectedTerm)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#5794aa] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#477f93] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {termStatusUpdatingId === selectedTerm.academic_term_id ? <LoaderCircle className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}
                  เปิดภาคการศึกษาและทุก Section
                </button>
              ) : (
                <button
                  type="button"
                  disabled={termStatusUpdatingId === selectedTerm.academic_term_id}
                  onClick={() => void handleTermStatus(selectedTerm)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#bddce7] bg-white px-5 text-sm font-medium text-[#477f93] shadow-sm transition hover:bg-[#f2f8fa] disabled:opacity-45"
                >
                  {termStatusUpdatingId === selectedTerm.academic_term_id ? <LoaderCircle className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}
                  {nextTermStatus[selectedTerm.status].label}
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {termModalOpen && (
        <TermModal
          key={editingTerm?.academic_term_id ?? "new-term"}
          term={editingTerm}
          onClose={() => { setTermModalOpen(false); setEditingTerm(null); }}
          onSaved={handleSaved}
        />
      )}
      {sectionModalOpen && workspace && (
        <SectionModal
          key={editingSection?.section_id ?? "new-section"}
          section={editingSection}
          terms={workspace.academic_terms}
          subjects={workspace.subjects}
          instructors={workspace.instructors}
          curriculumSubjects={workspace.curriculum_subjects}
          defaultTermId={selectedTerm?.academic_term_id ?? null}
          onClose={() => { setSectionModalOpen(false); setEditingSection(null); }}
          onSaved={handleSaved}
        />
      )}
      {meetingEditor && (
        <ClassMeetingModal
          key={`${meetingEditor.section.section_id}-${meetingEditor.meeting?.class_meeting_id ?? "new"}`}
          section={meetingEditor.section}
          meeting={meetingEditor.meeting}
          onClose={() => setMeetingEditor(null)}
          onSaved={handleMeetingSaved}
        />
      )}
    </>
  );
}
