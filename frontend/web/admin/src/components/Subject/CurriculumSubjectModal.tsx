"use client";

import { FormEvent, useMemo, useState } from "react";
import { BookPlus, LoaderCircle, Save, X } from "lucide-react";
import AdminSelect from "@/components/ui/AdminSelect";
import type {
  CurriculumSubjectPayload,
  CurriculumSubject,
  Subject,
  SubjectDepartment,
  SubjectFaculty,
} from "@/interfaces/subject-management.interface";

interface CurriculumSubjectModalProps {
  mapping: CurriculumSubject | null;
  subjects: Subject[];
  faculties: SubjectFaculty[];
  departments: SubjectDepartment[];
  onClose: () => void;
  onSave: (payload: CurriculumSubjectPayload) => Promise<void>;
}

const activeSubjects = (subjects: Subject[]) =>
  subjects
    .filter((subject) => subject.is_active)
    .sort((first, second) => first.subject_id.localeCompare(second.subject_id));

export default function CurriculumSubjectModal({
  mapping,
  subjects,
  faculties,
  departments,
  onClose,
  onSave,
}: CurriculumSubjectModalProps) {
  const catalog = useMemo(() => activeSubjects(subjects), [subjects]);
  const defaultFacultyId = mapping?.faculty_id ?? faculties[0]?.faculty_id;
  const [subjectId, setSubjectId] = useState(mapping?.subject_id ?? "");
  const [facultyId, setFacultyId] = useState(
    defaultFacultyId ? String(defaultFacultyId) : "",
  );
  const [departmentId, setDepartmentId] = useState(
    mapping ? String(mapping.department_id) : "",
  );
  const [yearLevel, setYearLevel] = useState(String(mapping?.academic_year ?? 1));
  const [semesterNo, setSemesterNo] = useState(String(mapping?.term ?? 1));
  const [isRequired, setIsRequired] = useState(String(mapping?.is_required ?? true));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const filteredDepartments = departments.filter(
    (department) => department.faculty_id === Number(facultyId),
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!subjectId || !facultyId || !departmentId) {
      setError("กรุณาเลือกวิชา คณะ และสาขาให้ครบ");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        ...(!mapping ? { subject_id: subjectId } : {}),
        department_id: Number(departmentId),
        academic_year: Number(yearLevel),
        term: Number(semesterNo),
        is_required: isRequired === "true",
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "ไม่สามารถบันทึกรายการหลักสูตรได้",
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
      aria-labelledby="curriculum-form-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(28,54,65,0.25)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-[#f0eef9] p-3 text-[#7468a8]">
              <BookPlus size={22} />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#7468a8]">
                Curriculum Mapping
              </p>
              <h2 id="curriculum-form-title" className="mt-0.5 text-xl font-semibold text-[#304852]">
                {mapping ? "แก้ไขวิชาในโครงสร้างหลักสูตร" : "เพิ่มวิชาเดิมเข้าหลักสูตร"}
              </h2>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="ปิด" className="rounded-full p-2 text-[#7d9098] transition hover:bg-[#edf4f6] disabled:opacity-50">
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="text-sm font-medium text-[#4c626c] sm:col-span-2">
            <span>รายวิชา</span>
            <AdminSelect
              value={subjectId}
              onChange={(value) => {
                setSubjectId(value);
                setError("");
              }}
              options={catalog.map((subject) => ({
                value: subject.subject_id,
                label: `${subject.subject_id} · ${subject.subject_name}`,
                description: `${subject.credits} หน่วยกิต · ${subject.subject_type_name}`,
              }))}
              ariaLabel="เลือกวิชาเข้าหลักสูตร"
              placeholder="เลือกวิชาที่มีอยู่แล้ว"
              appearance="cute"
              icon={BookPlus}
              className="mt-2"
              disabled={Boolean(mapping)}
            />
            {mapping && (
              <span className="mt-1 block text-[11px] font-normal text-[#96a4aa]">
                หากต้องการเปลี่ยนวิชา ให้ปิดรายการนี้แล้วเพิ่มรายการใหม่
              </span>
            )}
          </div>

          <div className="text-sm font-medium text-[#4c626c]">
            <span>คณะ</span>
            <AdminSelect
              value={facultyId}
              onChange={(value) => {
                setFacultyId(value);
                setDepartmentId("");
                setError("");
              }}
              options={faculties.map((faculty) => ({
                value: String(faculty.faculty_id),
                label: `${faculty.faculty_name} (${faculty.faculty_code})`,
              }))}
              ariaLabel="เลือกคณะ"
              placeholder="เลือกคณะ"
              appearance="cute"
              className="mt-2"
            />
          </div>
          <div className="text-sm font-medium text-[#4c626c]">
            <span>สาขาวิชา</span>
            <AdminSelect
              value={departmentId}
              onChange={(value) => {
                setDepartmentId(value);
                setError("");
              }}
              options={filteredDepartments.map((department) => ({
                value: String(department.department_id),
                label: `${department.department_name} (${department.department_code})`,
              }))}
              ariaLabel="เลือกสาขาวิชา"
              placeholder="เลือกสาขาวิชา"
              appearance="cute"
              className="mt-2"
              disabled={!facultyId || filteredDepartments.length === 0}
            />
          </div>
          <div className="text-sm font-medium text-[#4c626c]">
            <span>ชั้นปี</span>
            <AdminSelect
              value={yearLevel}
              onChange={setYearLevel}
              options={Array.from({ length: 4 }, (_, index) => ({
                value: String(index + 1),
                label: `ชั้นปีที่ ${index + 1}`,
              }))}
              ariaLabel="เลือกชั้นปี"
              appearance="cute"
              tone="violet"
              className="mt-2"
            />
          </div>
          <div className="text-sm font-medium text-[#4c626c]">
            <span>ภาคเรียน</span>
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
              tone="violet"
              className="mt-2"
            />
          </div>
          <div className="text-sm font-medium text-[#4c626c] sm:col-span-2">
            <span>ประเภทในหลักสูตร</span>
            <AdminSelect
              value={isRequired}
              onChange={setIsRequired}
              options={[
                { value: "true", label: "วิชาบังคับ", description: "นักศึกษาในหลักสูตรต้องลงทะเบียน" },
                { value: "false", label: "วิชาเลือก", description: "เป็นรายวิชาทางเลือกของหลักสูตร" },
              ]}
              ariaLabel="เลือกประเภทในหลักสูตร"
              appearance="cute"
              className="mt-2"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-[#fff0ec] px-3.5 py-3 text-sm text-[#a9503c] sm:col-span-2">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-[#edf1f3] pt-5 sm:col-span-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm text-[#687b84] transition hover:bg-[#eef4f6] disabled:opacity-50">
              ยกเลิก
            </button>
            <button type="submit" disabled={saving || catalog.length === 0} className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-[#7468a8] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#655a98] disabled:opacity-50">
              {saving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
              {saving ? "กำลังบันทึก" : "บันทึกหลักสูตร"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
