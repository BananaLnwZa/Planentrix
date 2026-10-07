"use client";

import { useMemo, useState } from "react";
import {
  ArchiveX,
  BookOpenCheck,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import AdminSelect from "@/components/ui/AdminSelect";
import type {
  CurriculumSubjectPayload,
  CurriculumSubject,
  Subject,
  SubjectDepartment,
  SubjectFaculty,
} from "@/interfaces/subject-management.interface";
import { subjectManagementService } from "@/services/subject-management.service";
import CurriculumSubjectModal from "./CurriculumSubjectModal";

export default function CurriculumManagementPanel({
  subjects,
  curriculumSubjects,
  faculties,
  departments,
  onChanged,
}: {
  subjects: Subject[];
  curriculumSubjects: CurriculumSubject[];
  faculties: SubjectFaculty[];
  departments: SubjectDepartment[];
  onChanged: (message: string) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<CurriculumSubject | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const visibleDepartments = departments.filter(
    (department) =>
      facultyFilter === "all" ||
      department.faculty_id === Number(facultyFilter),
  );
  const filteredMappings = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("th");
    return curriculumSubjects.filter(
      (subject) =>
        (!query ||
          subject.subject_id.toLocaleLowerCase().includes(query) ||
          subject.subject_name.toLocaleLowerCase("th").includes(query) ||
          subject.department_name.toLocaleLowerCase("th").includes(query)) &&
        (facultyFilter === "all" ||
          subject.faculty_id === Number(facultyFilter)) &&
        (departmentFilter === "all" ||
          subject.department_id === Number(departmentFilter)) &&
        (yearFilter === "all" ||
          subject.academic_year === Number(yearFilter)) &&
        (termFilter === "all" || subject.term === Number(termFilter)),
    );
  }, [curriculumSubjects, departmentFilter, facultyFilter, search, termFilter, yearFilter]);

  const handleSave = async (payload: CurriculumSubjectPayload) => {
    if (editingMapping) {
      const response = await subjectManagementService.updateCurriculumSubject(
        editingMapping.curriculum_subject_id,
        payload,
      );
      setModalOpen(false);
      setEditingMapping(null);
      await onChanged(
        `แก้ไข ${response.subject.subject_id} ในโครงสร้างหลักสูตรแล้ว`,
      );
      return;
    }
    const response = await subjectManagementService.createCurriculumSubject(payload);
    setModalOpen(false);
    await onChanged(
      `เพิ่ม ${response.subject.subject_id} เข้าหลักสูตร ${response.subject.department_code} แล้ว`,
    );
  };

  const handleStatus = async (subject: CurriculumSubject) => {
    setStatusUpdatingId(subject.curriculum_subject_id);
    setError("");
    try {
      const response = await subjectManagementService.setCurriculumSubjectStatus(
        subject.curriculum_subject_id,
        !subject.curriculum_is_active,
      );
      await onChanged(
        response.subject.curriculum_is_active
          ? `เปิด ${response.subject.subject_id} ในหลักสูตรนี้แล้ว`
          : `ปิด ${response.subject.subject_id} เฉพาะหลักสูตรนี้แล้ว`,
      );
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "ไม่สามารถเปลี่ยนสถานะหลักสูตรได้",
      );
    } finally {
      setStatusUpdatingId(null);
    }
  };

  return (
    <section className="mt-5">
      <div className="rounded-[24px] border border-[#e1eaed] bg-white p-5 shadow-[0_9px_28px_rgba(55,88,102,0.06)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[#7468a8]">Curriculum Structure</p>
            <h2 className="mt-1 text-xl font-semibold text-[#334b55]">จัดวิชาในโครงสร้างหลักสูตร</h2>
            <p className="mt-1 text-sm text-[#7d8f97]">
              นำวิชาที่มีอยู่ไปใช้ได้หลายสาขา ชั้นปี และภาคเรียน โดยไม่สร้างวิชาซ้ำ
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingMapping(null);
              setModalOpen(true);
            }}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#7468a8] px-5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#655a98]"
          >
            <Plus size={17} /> เพิ่มวิชาเดิมเข้าหลักสูตร
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="relative md:col-span-2 xl:col-span-1">
            <span className="sr-only">ค้นหารายการหลักสูตร</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8aa0aa]" size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหาวิชา"
              className="h-11 w-full rounded-xl border border-[#dce7eb] bg-[#f9fcfd] pl-10 pr-3 text-sm text-[#334b56] outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#dff3fa]"
            />
          </label>
          <AdminSelect
            value={facultyFilter}
            onChange={(value) => {
              setFacultyFilter(value);
              setDepartmentFilter("all");
            }}
            ariaLabel="กรองคณะ"
            options={[
              { value: "all", label: "ทุกคณะ" },
              ...faculties.map((faculty) => ({
                value: String(faculty.faculty_id),
                label: faculty.faculty_name,
              })),
            ]}
          />
          <AdminSelect
            value={departmentFilter}
            onChange={setDepartmentFilter}
            ariaLabel="กรองสาขา"
            options={[
              { value: "all", label: "ทุกสาขา" },
              ...visibleDepartments.map((department) => ({
                value: String(department.department_id),
                label: department.department_name,
              })),
            ]}
          />
          <AdminSelect
            value={yearFilter}
            onChange={setYearFilter}
            ariaLabel="กรองชั้นปี"
            options={[
              { value: "all", label: "ทุกชั้นปี" },
              ...Array.from({ length: 4 }, (_, index) => ({
                value: String(index + 1),
                label: `ชั้นปีที่ ${index + 1}`,
              })),
            ]}
          />
          <AdminSelect
            value={termFilter}
            onChange={setTermFilter}
            ariaLabel="กรองภาคเรียน"
            options={[
              { value: "all", label: "ทุกภาคเรียน" },
              { value: "1", label: "ภาคเรียนที่ 1" },
              { value: "2", label: "ภาคเรียนที่ 2" },
              { value: "3", label: "ภาคฤดูร้อน" },
            ]}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-2xl border border-[#efcfca] bg-[#fff5f2] px-4 py-3 text-sm text-[#a85c49]">
          {error}
        </p>
      )}

      <div className="mb-3 mt-5 flex items-center justify-between">
        <p className="text-sm font-medium text-[#607b86]">รายการในหลักสูตร</p>
        <span className="rounded-full bg-[#f0eef9] px-3 py-1.5 text-xs text-[#7468a8]">
          {filteredMappings.length} รายการ
        </span>
      </div>
      {filteredMappings.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-[24px] border border-dashed border-[#ccdfe6] bg-white px-5 text-center">
          <span className="rounded-full bg-[#f0eef9] p-4 text-[#7468a8]"><BookOpenCheck size={27} /></span>
          <p className="mt-4 font-medium text-[#465d67]">ยังไม่มีวิชาในโครงสร้างที่เลือก</p>
          <p className="mt-1 text-sm text-[#82939a]">เพิ่มวิชาที่มีอยู่แล้วเข้าสู่สาขา ชั้นปี และภาคเรียนนี้ได้ทันที</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMappings.map((subject) => (
            <article
              key={subject.curriculum_subject_id}
              className={`rounded-[22px] border p-5 shadow-sm ${
                subject.curriculum_is_active
                  ? "border-[#dfeaec] bg-white"
                  : "border-[#e1e4e5] bg-[#f3f5f5] opacity-80"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold text-[#4b91aa]">{subject.subject_id}</p>
                  <h3 className="mt-1 line-clamp-2 font-semibold text-[#334b55]">{subject.subject_name}</h3>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${subject.is_required ? "bg-[#eaf6fa] text-[#477f93]" : "bg-[#fff4dc] text-[#956b25]"}`}>
                  {subject.is_required ? "วิชาบังคับ" : "วิชาเลือก"}
                </span>
              </div>
              <div className="mt-4 rounded-2xl bg-[#f7fbfc] p-3 text-sm text-[#60747d]">
                <p>{subject.faculty_name} · {subject.department_name}</p>
                <p className="mt-1">ชั้นปี {subject.academic_year} · {subject.term === 3 ? "ภาคฤดูร้อน" : `ภาคเรียนที่ ${subject.term}`}</p>
              </div>
              {!subject.subject_is_active && (
                <p className="mt-3 rounded-xl bg-[#fff0ec] px-3 py-2 text-xs text-[#a65d4a]">
                  วิชาหลักถูกปิดใช้งาน รายการนี้จึงยังไม่แสดงให้นักศึกษา
                </p>
              )}
              <div className="mt-4 flex items-center justify-between border-t border-[#edf1f3] pt-4">
                <span className={`text-xs font-medium ${subject.curriculum_is_active ? "text-[#438064]" : "text-[#8a969b]"}`}>
                  {subject.curriculum_is_active ? "เปิดในหลักสูตร" : "ปิดเฉพาะหลักสูตร"}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMapping(subject);
                      setModalOpen(true);
                    }}
                    title="แก้ไขรายการหลักสูตร"
                    aria-label={`แก้ไข ${subject.subject_name} ในหลักสูตร`}
                    className="inline-flex size-9 items-center justify-center rounded-xl bg-[#e9f5f9] text-[#43839a] transition hover:bg-[#d9edf4]"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleStatus(subject)}
                    disabled={statusUpdatingId === subject.curriculum_subject_id}
                    title={subject.curriculum_is_active ? "ปิดเฉพาะหลักสูตรนี้" : "เปิดในหลักสูตรนี้"}
                    aria-label={`${subject.curriculum_is_active ? "ปิด" : "เปิด"} ${subject.subject_name} ในหลักสูตร`}
                    className={`inline-flex size-9 items-center justify-center rounded-xl transition disabled:opacity-50 ${subject.curriculum_is_active ? "bg-[#fff0ec] text-[#c6644d] hover:bg-[#ffe1d9]" : "bg-[#e9f6ef] text-[#438064] hover:bg-[#d9ede3]"}`}
                  >
                    {statusUpdatingId === subject.curriculum_subject_id ? (
                      <LoaderCircle className="animate-spin" size={16} />
                    ) : subject.curriculum_is_active ? (
                      <ArchiveX size={16} />
                    ) : (
                      <RotateCcw size={16} />
                    )}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <CurriculumSubjectModal
          key={editingMapping?.curriculum_subject_id ?? "new-curriculum"}
          mapping={editingMapping}
          subjects={subjects}
          faculties={faculties}
          departments={departments}
          onClose={() => {
            setModalOpen(false);
            setEditingMapping(null);
          }}
          onSave={handleSave}
        />
      )}
    </section>
  );
}
