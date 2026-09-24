"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, GraduationCap, LoaderCircle, Save, X } from "lucide-react";
import type {
  ManagedUser,
  UpdateManagedUserRequest,
  UserDepartmentFilterOption,
  UserFacultyFilterOption,
} from "@/interfaces/user-management.interface";
import AdminSelect from "@/components/ui/AdminSelect";

interface EditUserModalProps {
  user: ManagedUser;
  faculties: UserFacultyFilterOption[];
  departments: UserDepartmentFilterOption[];
  onClose: () => void;
  onSave: (data: UpdateManagedUserRequest) => Promise<void>;
}

export default function EditUserModal({
  user,
  faculties,
  departments,
  onClose,
  onSave,
}: EditUserModalProps) {
  const [facultyId, setFacultyId] = useState(user.faculty_id.toString());
  const [departmentId, setDepartmentId] = useState(user.department_id.toString());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const availableDepartments = departments.filter(
    (department) => department.faculty_id === Number(facultyId),
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!facultyId || !departmentId) {
      setError("กรุณาเลือกคณะและสาขาวิชา");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave({
        department_id: Number(departmentId),
        version: user.version,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#243b45]/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-user-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-[26px] border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(28,54,65,0.25)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#64a0b5]">Student</p>
            <h2 id="edit-user-title" className="mt-1 text-xl font-semibold text-[#304852]">แก้ไขคณะและสาขา</h2>
            <p className="mt-1 text-sm text-[#7b8d95]">{[user.first_name, user.last_name].filter(Boolean).join(" ") || user.user_name}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="ปิด" className="rounded-full p-2 text-[#7d9098] transition hover:bg-[#edf4f6] disabled:opacity-50">
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <label className="block text-sm font-medium text-[#4c626c]">
            คณะ
            <AdminSelect
              value={facultyId}
              onChange={(value) => {
                setFacultyId(value);
                setDepartmentId("");
                setError("");
              }}
              options={faculties.map((faculty) => ({
                value: String(faculty.faculty_id),
                label: faculty.faculty_name,
                description: faculty.faculty_code,
              }))}
              ariaLabel="เลือกคณะ"
              placeholder="เลือกคณะ"
              className="mt-2"
              disabled={saving}
              appearance="cute"
              icon={Building2}
            />
          </label>

          <label className="block text-sm font-medium text-[#4c626c]">
            สาขาวิชา
            <AdminSelect
              value={departmentId}
              onChange={(value) => {
                setDepartmentId(value);
                setError("");
              }}
              options={availableDepartments.map((department) => ({
                value: String(department.department_id),
                label: department.department_name,
                description: department.department_code,
              }))}
              ariaLabel="เลือกสาขาวิชา"
              placeholder={facultyId ? "เลือกสาขาวิชา" : "เลือกคณะก่อน"}
              className="mt-2"
              disabled={!facultyId || saving}
              appearance="cute"
              icon={GraduationCap}
            />
          </label>

          {error && <p role="alert" className="rounded-xl bg-[#fff0ec] px-3.5 py-3 text-sm text-[#a9503c]">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm text-[#687b84] transition hover:bg-[#eef4f6] disabled:opacity-50">ยกเลิก</button>
            <button type="submit" disabled={saving} className="inline-flex min-w-28 items-center justify-center gap-2 rounded-xl bg-[#4c93ac] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#3f8299] disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
              {saving ? "กำลังบันทึก" : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
