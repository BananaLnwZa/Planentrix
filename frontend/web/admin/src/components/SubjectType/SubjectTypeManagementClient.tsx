"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, LoaderCircle, RefreshCw, X } from "lucide-react";
import { ManagedSubjectType } from "@/interfaces/subject-type-management.interface";
import { subjectTypeManagementService } from "@/services/subject-type-management.service";
import DeleteSubjectTypeModal from "./DeleteSubjectTypeModal";
import SubjectTypeFormModal from "./SubjectTypeFormModal";
import SubjectTypeGrid from "./SubjectTypeGrid";
import SubjectTypeSummaryCards from "./SubjectTypeSummaryCards";
import SubjectTypeToolbar from "./SubjectTypeToolbar";

const sortSubjectTypes = (subjectTypes: ManagedSubjectType[]) =>
  [...subjectTypes].sort(
    (first, second) => first.subject_type_id - second.subject_type_id,
  );

export default function SubjectTypeManagementClient() {
  const [subjectTypes, setSubjectTypes] = useState<ManagedSubjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingSubjectType, setEditingSubjectType] =
    useState<ManagedSubjectType | null>(null);
  const [deletingSubjectType, setDeletingSubjectType] =
    useState<ManagedSubjectType | null>(null);

  const loadSubjectTypes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await subjectTypeManagementService.getSubjectTypes();
      setSubjectTypes(sortSubjectTypes(response.subject_types));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "ไม่สามารถโหลดประเภทวิชาได้",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    subjectTypeManagementService
      .getSubjectTypes()
      .then((response) => {
        if (active) setSubjectTypes(sortSubjectTypes(response.subject_types));
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "ไม่สามารถโหลดประเภทวิชาได้",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredSubjectTypes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return subjectTypes.filter(
      (type) =>
        !query ||
        type.subject_type_name.toLocaleLowerCase().includes(query) ||
        String(type.subject_type_id).includes(query.replace(/^#/, "")),
    );
  }, [search, subjectTypes]);

  const openCreateForm = () => {
    setEditingSubjectType(null);
    setFormOpen(true);
  };

  const openEditForm = (subjectType: ManagedSubjectType) => {
    setEditingSubjectType(subjectType);
    setFormOpen(true);
  };

  const handleSave = async (name: string) => {
    if (editingSubjectType) {
      const response = await subjectTypeManagementService.updateSubjectType(
        editingSubjectType.subject_type_id,
        { subject_type_name: name },
      );
      setSubjectTypes((current) =>
        sortSubjectTypes(
          current.map((type) =>
            type.subject_type_id === response.subject_type.subject_type_id
              ? response.subject_type
              : type,
          ),
        ),
      );
      setNotice(`เปลี่ยนชื่อประเภทวิชาเป็น “${response.subject_type.subject_type_name}” แล้ว`);
    } else {
      const response = await subjectTypeManagementService.createSubjectType({
        subject_type_name: name,
      });
      setSubjectTypes((current) =>
        sortSubjectTypes([...current, response.subject_type]),
      );
      setNotice(`เพิ่มประเภทวิชา “${response.subject_type.subject_type_name}” แล้ว`);
    }

    setFormOpen(false);
    setEditingSubjectType(null);
  };

  const handleDelete = async () => {
    if (!deletingSubjectType) return;
    await subjectTypeManagementService.deleteSubjectType(
      deletingSubjectType.subject_type_id,
    );
    setSubjectTypes((current) =>
      current.filter(
        (type) =>
          type.subject_type_id !== deletingSubjectType.subject_type_id,
      ),
    );
    setNotice(`ลบประเภทวิชา “${deletingSubjectType.subject_type_name}” แล้ว`);
    setDeletingSubjectType(null);
  };

  return (
    <>
      <div className="mt-7">
        <SubjectTypeSummaryCards subjectTypes={subjectTypes} />
      </div>
      <div className="mt-5">
        <SubjectTypeToolbar
          search={search}
          resultCount={filteredSubjectTypes.length}
          onSearchChange={setSearch}
          onAdd={openCreateForm}
        />
      </div>

      {notice && (
        <div
          className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[#cce9dc] bg-[#f0fbf6] px-4 py-3 text-sm text-[#39785f]"
          role="status"
        >
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="ปิดข้อความ">
            <X size={17} />
          </button>
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-[24px] border border-[#e1eaed] bg-white text-[#66808b]">
            <LoaderCircle className="animate-spin text-[#7669aa]" size={30} />
            <p className="text-sm">กำลังโหลดประเภทวิชา...</p>
          </div>
        ) : error ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-[24px] border border-[#e1eaed] bg-white px-5 text-center">
            <span className="rounded-full bg-[#fff0ec] p-4 text-[#cb6b53]">
              <AlertCircle size={27} />
            </span>
            <p className="mt-4 font-medium text-[#465d67]">โหลดข้อมูลไม่สำเร็จ</p>
            <p className="mt-1 max-w-md text-sm text-[#82939a]">{error}</p>
            <button
              type="button"
              onClick={() => void loadSubjectTypes()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#7669aa] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#685b9b]"
            >
              <RefreshCw size={16} /> ลองอีกครั้ง
            </button>
          </div>
        ) : (
          <SubjectTypeGrid
            subjectTypes={filteredSubjectTypes}
            onEdit={openEditForm}
            onDelete={setDeletingSubjectType}
          />
        )}
      </div>

      {formOpen && (
        <SubjectTypeFormModal
          key={editingSubjectType?.subject_type_id ?? "new-subject-type"}
          subjectType={editingSubjectType}
          onClose={() => {
            setFormOpen(false);
            setEditingSubjectType(null);
          }}
          onSave={handleSave}
        />
      )}
      {deletingSubjectType && (
        <DeleteSubjectTypeModal
          key={deletingSubjectType.subject_type_id}
          subjectType={deletingSubjectType}
          onClose={() => setDeletingSubjectType(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
