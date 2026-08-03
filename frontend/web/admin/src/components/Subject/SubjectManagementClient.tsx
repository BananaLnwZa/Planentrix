"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, LoaderCircle, RefreshCw, X } from "lucide-react";
import { Subject, SubjectPayload, SubjectType } from "@/interfaces/subject-management.interface";
import { subjectManagementService } from "@/services/subject-management.service";
import SubjectStatusModal from "./SubjectStatusModal";
import SubjectFormModal from "./SubjectFormModal";
import SubjectHierarchy from "./SubjectHierarchy";
import SubjectSummaryCards from "./SubjectSummaryCards";
import SubjectToolbar from "./SubjectToolbar";
import SubjectTypeLegend from "./SubjectTypeLegend";

const sortSubjects = (subjects: Subject[]) =>
  [...subjects].sort(
    (first, second) =>
      first.academic_year - second.academic_year ||
      first.term - second.term ||
      first.subject_id.localeCompare(second.subject_id),
  );

export default function SubjectManagementClient() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectTypes, setSubjectTypes] = useState<SubjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [statusSubject, setStatusSubject] = useState<Subject | null>(null);

  const loadSubjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await subjectManagementService.getSubjects();
      setSubjects(sortSubjects(response.subjects));
      setSubjectTypes(response.subject_types);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดข้อมูลวิชาได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    subjectManagementService
      .getSubjects()
      .then((response) => {
        if (!active) return;
        setSubjects(sortSubjects(response.subjects));
        setSubjectTypes(response.subject_types);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดข้อมูลวิชาได้");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return subjects.filter((subject) => {
      const matchesSearch =
        !query ||
        subject.subject_id.toLocaleLowerCase().includes(query) ||
        subject.subject_name.toLocaleLowerCase().includes(query) ||
        subject.teacher_name.toLocaleLowerCase().includes(query) ||
        subject.classroom.toLocaleLowerCase().includes(query);
      const matchesType =
        selectedType === "all" || subject.subject_type_id === Number(selectedType);
      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "active" && subject.is_active) ||
        (selectedStatus === "inactive" && !subject.is_active);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [search, selectedStatus, selectedType, subjects]);

  const openCreateForm = () => {
    setEditingSubject(null);
    setFormOpen(true);
  };

  const openEditForm = (subject: Subject) => {
    setEditingSubject(subject);
    setFormOpen(true);
  };

  const handleSave = async (payload: SubjectPayload) => {
    if (editingSubject) {
      const response = await subjectManagementService.updateSubject(
        editingSubject.subject_id,
        payload,
      );
      setSubjects((current) =>
        sortSubjects(
          current.map((subject) =>
            subject.subject_id === response.subject.subject_id
              ? response.subject
              : subject,
          ),
        ),
      );
      setNotice(`บันทึกการแก้ไขวิชา ${response.subject.subject_id} แล้ว`);
    } else {
      const response = await subjectManagementService.createSubject(payload);
      setSubjects((current) => sortSubjects([...current, response.subject]));
      setNotice(`เพิ่มวิชา ${response.subject.subject_id} แล้ว`);
    }

    setFormOpen(false);
    setEditingSubject(null);
  };

  const handleStatusChange = async () => {
    if (!statusSubject) return;
    const response = statusSubject.is_active
      ? await subjectManagementService.deactivateSubject(statusSubject.subject_id)
      : await subjectManagementService.setSubjectStatus(
          statusSubject.subject_id,
          true,
        );

    setSubjects((current) =>
      sortSubjects(
        current.map((subject) =>
          subject.subject_id === response.subject.subject_id
            ? response.subject
            : subject,
        ),
      ),
    );
    setNotice(
      response.subject.is_active
        ? `กู้คืนวิชา ${response.subject.subject_id} แล้ว`
        : `ปิดใช้งานวิชา ${response.subject.subject_id} แล้ว`,
    );
    setStatusSubject(null);
  };

  return (
    <>
      <div className="mt-7"><SubjectSummaryCards subjects={subjects} subjectTypes={subjectTypes} /></div>
      <div className="mt-5"><SubjectTypeLegend subjectTypes={subjectTypes} subjects={subjects} /></div>
      <div className="mt-5">
        <SubjectToolbar
          search={search}
          selectedType={selectedType}
          selectedStatus={selectedStatus}
          subjectTypes={subjectTypes}
          resultCount={filteredSubjects.length}
          onSearchChange={setSearch}
          onTypeChange={setSelectedType}
          onStatusChange={setSelectedStatus}
          onAdd={openCreateForm}
        />
      </div>

      {notice && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[#cce9dc] bg-[#f0fbf6] px-4 py-3 text-sm text-[#39785f]" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="ปิดข้อความ"><X size={17} /></button>
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-[24px] border border-[#e1eaed] bg-white text-[#66808b]">
            <LoaderCircle className="animate-spin text-[#559ab3]" size={30} />
            <p className="text-sm">กำลังโหลดข้อมูลวิชา...</p>
          </div>
        ) : error ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-[24px] border border-[#e1eaed] bg-white px-5 text-center">
            <span className="rounded-full bg-[#fff0ec] p-4 text-[#cb6b53]"><AlertCircle size={27} /></span>
            <p className="mt-4 font-medium text-[#465d67]">โหลดข้อมูลไม่สำเร็จ</p>
            <p className="mt-1 max-w-md text-sm text-[#82939a]">{error}</p>
            <button type="button" onClick={() => void loadSubjects()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#4d94ad] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#40839a]"><RefreshCw size={16} /> ลองอีกครั้ง</button>
          </div>
        ) : (
          <SubjectHierarchy subjects={filteredSubjects} onEdit={openEditForm} onStatusChange={setStatusSubject} />
        )}
      </div>

      {formOpen && (
        <SubjectFormModal
          key={editingSubject?.subject_id ?? "new-subject"}
          subject={editingSubject}
          subjectTypes={subjectTypes}
          onClose={() => { setFormOpen(false); setEditingSubject(null); }}
          onSave={handleSave}
        />
      )}
      {statusSubject && (
        <SubjectStatusModal
          key={`${statusSubject.subject_id}-${statusSubject.is_active}`}
          subject={statusSubject}
          onClose={() => setStatusSubject(null)}
          onConfirm={handleStatusChange}
        />
      )}
    </>
  );
}
