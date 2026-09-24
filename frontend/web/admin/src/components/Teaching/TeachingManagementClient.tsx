"use client";

import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  CircleOff,
  Clock3,
  DoorOpen,
  GraduationCap,
  LoaderCircle,
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
  CreateAcademicTermPayload,
  SaveCourseSectionPayload,
  TeachingAcademicTerm,
  TeachingCourseSection,
  TeachingInstructor,
  TeachingSubject,
  TeachingWorkspaceResponse,
} from "@/interfaces/teaching-management.interface";
import { teachingManagementService } from "@/services/teaching-management.service";
import AdminSelect from "@/components/ui/AdminSelect";

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

const dateInputClass =
  "mt-2 h-11 w-full rounded-xl border border-[#dbe6ea] bg-[#fbfdfe] px-3.5 text-sm font-normal text-[#304852] outline-none transition focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]";

interface TermModalProps {
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}

function TermModal({ onClose, onSaved }: TermModalProps) {
  const [academicYear, setAcademicYear] = useState(
    String(new Date().getFullYear() + 543),
  );
  const [semesterNo, setSemesterNo] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [midtermStart, setMidtermStart] = useState("");
  const [midtermEnd, setMidtermEnd] = useState("");
  const [finalStart, setFinalStart] = useState("");
  const [finalEnd, setFinalEnd] = useState("");
  const [status, setStatus] = useState<"draft" | "active">("active");
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

    const payload: CreateAcademicTermPayload = {
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
      await teachingManagementService.createAcademicTerm(payload);
      await onSaved(`สร้างปีการศึกษา ${academicYear} ภาคเรียนที่ ${semesterNo} แล้ว`);
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
              เพิ่มภาคการศึกษา
            </h2>
            <p className="mt-1 text-sm text-[#7d9098]">
              สร้างรอบการศึกษาก่อนเปิดกลุ่มเรียนและมอบหมายผู้สอน
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

          <label className="text-sm font-medium text-[#4c626c] sm:col-span-2">
            สถานะเริ่มต้น
            <AdminSelect
              value={status}
              onChange={(value) => setStatus(value as "draft" | "active")}
              options={[
                { value: "active", label: "เริ่มใช้งานทันที", description: "ใช้เปิดกลุ่มเรียนได้ทันที" },
                { value: "draft", label: "บันทึกเป็นฉบับร่าง", description: "เตรียมข้อมูลไว้ก่อน" },
              ]}
              ariaLabel="เลือกสถานะภาคการศึกษา"
              appearance="cute"
              icon={Clock3}
              className="mt-2"
            />
          </label>

          {error && <p role="alert" className="rounded-xl bg-[#fff0ec] px-3.5 py-3 text-sm text-[#a9503c] sm:col-span-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm text-[#687b84] transition hover:bg-[#eef4f6] disabled:opacity-50">ยกเลิก</button>
            <button type="submit" disabled={saving} className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-[#5794aa] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#477f93] disabled:opacity-60">
              {saving ? <LoaderCircle className="animate-spin" size={17} /> : <CalendarPlus size={17} />}
              {saving ? "กำลังบันทึก" : "สร้างภาคการศึกษา"}
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
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}

function SectionModal({
  section,
  terms,
  subjects,
  instructors,
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
    section ? String(section.academic_term_id) : "",
  );
  const [sectionNumber, setSectionNumber] = useState(section?.section_number ?? "");
  const [capacity, setCapacity] = useState(
    section?.capacity === null || section?.capacity === undefined
      ? ""
      : String(section.capacity),
  );
  const [status, setStatus] = useState<CourseSectionStatus>(section?.status ?? "open");
  const [ownerId, setOwnerId] = useState(owner ? String(owner.instructor_id) : "");
  const [coInstructorIds, setCoInstructorIds] = useState(initialCoInstructorIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedSubject = subjects.find((subject) => subject.subject_id === subjectId);
  const eligibleInstructors = instructors.filter((instructor) =>
    selectedSubject?.department_ids.includes(instructor.department_id),
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
    if (!subjectId || !termId || !sectionNumber.trim() || !ownerId) {
      setError("กรุณาเลือกวิชา ภาคการศึกษา กลุ่มเรียน และอาจารย์เจ้าของวิชา");
      return;
    }
    const payload: SaveCourseSectionPayload = {
      subject_id: subjectId,
      academic_term_id: Number(termId),
      section_number: sectionNumber.trim(),
      capacity: capacity ? Number(capacity) : null,
      status,
      owner_instructor_id: Number(ownerId),
      co_instructor_ids: coInstructorIds.map(Number),
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
              {section ? "แก้ไขกลุ่มเรียนและผู้สอน" : "เปิดกลุ่มเรียนและมอบหมายผู้สอน"}
            </h2>
            <p className="mt-1 text-sm text-[#7d9098]">
              เชื่อมวิชากับภาคการศึกษาและบัญชีอาจารย์ตาม ER
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
              onChange={(value) => { setTermId(value); setError(""); }}
              options={terms.filter((term) => term.status === "draft" || term.status === "active").map((term) => ({ value: String(term.academic_term_id), label: `ปี ${term.academic_year} · ภาคเรียน ${term.semester_no}`, description: termStatusLabel[term.status] }))}
              ariaLabel="เลือกภาคการศึกษา"
              placeholder="เลือกภาคการศึกษา"
              appearance="cute"
              icon={CalendarDays}
              className="mt-2"
            />
          </label>
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
              options={sectionStatusOptions}
              ariaLabel="เลือกสถานะกลุ่มเรียน"
              appearance="cute"
              icon={DoorOpen}
              className="mt-2"
            />
          </label>

          <div className="rounded-2xl border border-[#e2e5f0] bg-[#faf9fe] p-4 sm:col-span-2">
            <div className="flex items-center gap-2 text-[#62578f]"><GraduationCap size={18} /><p className="text-sm font-medium">อาจารย์ผู้สอน</p></div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-[#4c626c]">
                อาจารย์เจ้าของวิชา
                <AdminSelect
                  value={ownerId}
                  onChange={(value) => { setOwnerId(value); setCoInstructorIds((current) => current.filter((id) => id !== value)); setError(""); }}
                  options={eligibleInstructors.map((instructor) => ({ value: String(instructor.admin_id), label: instructorLabel(instructor), description: instructor.department_name }))}
                  ariaLabel="เลือกอาจารย์เจ้าของวิชา"
                  placeholder={!subjectId ? "เลือกวิชาก่อน" : eligibleInstructors.length ? "เลือกอาจารย์" : "ยังไม่มีอาจารย์ในสาขานี้"}
                  appearance="cute"
                  icon={UserRound}
                  className="mt-2"
                  disabled={!subjectId || eligibleInstructors.length === 0}
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
              {saving ? "กำลังบันทึก" : section ? "บันทึกการแก้ไข" : "เปิดกลุ่มเรียน"}
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
  const [termFilter, setTermFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<TeachingCourseSection | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setWorkspace(await teachingManagementService.getWorkspace());
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
        if (active) setWorkspace(response);
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
  const filteredSections = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("th");
    return sections.filter((section) => {
      const instructorNames = section.instructors
        .map((instructor) => `${instructor.first_name} ${instructor.last_name} ${instructor.admin_name}`)
        .join(" ")
        .toLocaleLowerCase("th");
      return (
        (termFilter === "all" || section.academic_term_id === Number(termFilter)) &&
        (statusFilter === "all" || section.status === statusFilter) &&
        (!query ||
          section.subject_id.toLocaleLowerCase().includes(query) ||
          section.subject_name.toLocaleLowerCase().includes(query) ||
          section.section_number.toLocaleLowerCase().includes(query) ||
          instructorNames.includes(query))
      );
    });
  }, [search, sections, statusFilter, termFilter]);

  const handleSaved = async (message: string) => {
    setTermModalOpen(false);
    setSectionModalOpen(false);
    setEditingSection(null);
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

  return (
    <>
      <section className="rounded-[28px] border border-[#dcebf0] bg-[linear-gradient(135deg,#ffffff_0%,#eef8fb_100%)] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#e4f4f9] px-3 py-1.5 text-xs font-medium text-[#4d879c]"><GraduationCap size={15} /> Teaching Assignment</div>
            <h1 className="mt-4 text-2xl font-semibold text-[#304b56] sm:text-3xl">การเปิดสอนและมอบหมายอาจารย์</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71858e]">เชื่อมรายวิชากับภาคการศึกษา กลุ่มเรียน และอาจารย์ผู้สอนตามโครงสร้าง ER</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setTermModalOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-full border border-[#bddce7] bg-white px-4 text-sm font-medium text-[#477f93] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><CalendarPlus size={17} /> เพิ่มภาคการศึกษา</button>
            <button type="button" onClick={() => { setEditingSection(null); setSectionModalOpen(true); }} disabled={!workspace?.academic_terms.length || !workspace.subjects.length || !workspace.instructors.length} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#7468a8] px-5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#655a98] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45"><Plus size={17} /> เปิดกลุ่มเรียน</button>
          </div>
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

      <section className="mt-6 rounded-[26px] border border-[#dfeaec] bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_260px_220px]">
          <label className="relative block">
            <span className="sr-only">ค้นหา</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7f969f]" size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาวิชา กลุ่มเรียน หรือชื่ออาจารย์" className="h-12 w-full rounded-2xl border border-[#d5e3e7] bg-[#fbfdfe] pl-11 pr-4 text-sm text-[#405862] outline-none transition focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]" />
          </label>
          <AdminSelect
            value={termFilter}
            onChange={setTermFilter}
            options={[
              { value: "all", label: "ทุกภาคการศึกษา" },
              ...(workspace?.academic_terms.map((term) => ({ value: String(term.academic_term_id), label: `ปี ${term.academic_year} · เทอม ${term.semester_no}` })) ?? []),
            ]}
            ariaLabel="กรองภาคการศึกษา"
            appearance="cute"
            icon={CalendarDays}
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

      <section className="mt-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><p className="text-sm font-medium text-[#4f879c]">Course Sections</p><h2 className="mt-1 text-xl font-semibold text-[#304b56]">กลุ่มเรียนที่เปิดสอน</h2></div>
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
                  <div className="mt-4 flex justify-end gap-2">
                    {canToggle && <button type="button" disabled={statusUpdatingId === section.section_id} onClick={() => void handleQuickStatus(section)} className="inline-flex items-center gap-2 rounded-xl border border-[#d6e3e7] px-3.5 py-2 text-xs font-medium text-[#607983] transition hover:bg-[#f2f8fa] disabled:opacity-50">{statusUpdatingId === section.section_id ? <LoaderCircle className="animate-spin" size={15} /> : section.status === "open" ? <CircleOff size={15} /> : <DoorOpen size={15} />}{section.status === "open" ? "ปิดรับ" : "เปิดสอน"}</button>}
                    <button type="button" onClick={() => { setEditingSection(section); setSectionModalOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-[#eef4f7] px-3.5 py-2 text-xs font-medium text-[#4f7f91] transition hover:bg-[#e1edf2]"><Pencil size={15} /> แก้ไข</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {termModalOpen && <TermModal onClose={() => setTermModalOpen(false)} onSaved={handleSaved} />}
      {sectionModalOpen && workspace && (
        <SectionModal
          key={editingSection?.section_id ?? "new-section"}
          section={editingSection}
          terms={workspace.academic_terms}
          subjects={workspace.subjects}
          instructors={workspace.instructors}
          onClose={() => { setSectionModalOpen(false); setEditingSection(null); }}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
