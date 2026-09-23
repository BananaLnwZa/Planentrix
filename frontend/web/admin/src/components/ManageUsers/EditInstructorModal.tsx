"use client";

import { FormEvent, useEffect, useState } from "react";
import { LoaderCircle, Save, X } from "lucide-react";
import type {
  ManagedInstructor,
  UpdateManagedInstructorRequest,
  UserDepartmentFilterOption,
  UserFacultyFilterOption,
} from "@/interfaces/user-management.interface";

interface EditInstructorModalProps {
  instructor: ManagedInstructor;
  departments: UserDepartmentFilterOption[];
  faculties: UserFacultyFilterOption[];
  onClose: () => void;
  onSave: (data: UpdateManagedInstructorRequest) => Promise<void>;
}

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-[#dbe6ea] bg-[#fbfdfe] px-3.5 font-normal text-[#304852] outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]";

export default function EditInstructorModal({
  instructor,
  departments,
  faculties,
  onClose,
  onSave,
}: EditInstructorModalProps) {
  const [adminName, setAdminName] = useState(instructor.admin_name);
  const [firstName, setFirstName] = useState(instructor.first_name);
  const [lastName, setLastName] = useState(instructor.last_name);
  const [email, setEmail] = useState(instructor.admin_email);
  const [phone, setPhone] = useState(instructor.phone ?? "");
  const [address, setAddress] = useState(instructor.address ?? "");
  const [departmentId, setDepartmentId] = useState(
    instructor.department_id?.toString() ?? "",
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = adminName.trim();
    if (!/^(?=.*[a-zA-Z])[a-zA-Z0-9]{3,50}$/.test(normalizedName)) {
      setError("ชื่อผู้ใช้ต้องมี 3–50 ตัว ใช้เฉพาะภาษาอังกฤษหรือตัวเลข และต้องมีตัวอักษรอย่างน้อย 1 ตัว");
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError("กรุณากรอกชื่อและนามสกุล");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("กรุณากรอกอีเมลให้ถูกต้อง");
      return;
    }
    if (!departmentId) {
      setError("กรุณาเลือกสาขาวิชา");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave({
        admin_name: normalizedName,
        admin_email: email.trim().toLowerCase(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        department_id: Number(departmentId),
        version: instructor.version,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setSaving(false);
    }
  };

  const facultyById = new Map(faculties.map((faculty) => [faculty.faculty_id, faculty]));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#243b45]/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-instructor-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[26px] border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(28,54,65,0.25)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#7468a8]">Instructor</p>
            <h2 id="edit-instructor-title" className="mt-1 text-xl font-semibold text-[#304852]">แก้ไขข้อมูลอาจารย์</h2>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="ปิด" className="rounded-full p-2 text-[#7d9098] transition hover:bg-[#edf4f6] disabled:opacity-50">
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-[#4c626c] sm:col-span-2">
            ชื่อผู้ใช้
            <input autoFocus value={adminName} onChange={(event) => setAdminName(event.target.value)} maxLength={50} className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-[#4c626c]">
            ชื่อ
            <input value={firstName} onChange={(event) => setFirstName(event.target.value)} maxLength={100} className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-[#4c626c]">
            นามสกุล
            <input value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={100} className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-[#4c626c] sm:col-span-2">
            อีเมล
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={255} className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-[#4c626c]">
            เบอร์โทร
            <input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={20} className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-[#4c626c]">
            สาขาวิชา
            <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className={inputClass}>
              <option value="">เลือกสาขาวิชา</option>
              {departments.map((department) => {
                const faculty = facultyById.get(department.faculty_id);
                return (
                  <option key={department.department_id} value={department.department_id}>
                    {department.department_name}{faculty ? ` · ${faculty.faculty_name}` : ""}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="block text-sm font-medium text-[#4c626c] sm:col-span-2">
            ที่อยู่
            <textarea value={address} onChange={(event) => setAddress(event.target.value)} maxLength={255} rows={3} className="mt-2 w-full resize-none rounded-xl border border-[#dbe6ea] bg-[#fbfdfe] px-3.5 py-3 font-normal text-[#304852] outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]" />
          </label>

          {error && <p role="alert" className="rounded-xl bg-[#fff0ec] px-3.5 py-3 text-sm text-[#a9503c] sm:col-span-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm text-[#687b84] transition hover:bg-[#eef4f6] disabled:opacity-50">ยกเลิก</button>
            <button type="submit" disabled={saving} className="inline-flex min-w-28 items-center justify-center gap-2 rounded-xl bg-[#7468a8] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#655a98] disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
              {saving ? "กำลังบันทึก" : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
