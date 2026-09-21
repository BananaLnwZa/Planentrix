"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import type {
  Department,
  FacultyOption,
} from "@/interfaces/academic-unit.interface";
import { academicUnitManagementService } from "@/services/academic-unit-management.service";

const sortDepartments = (items: Department[]) =>
  [...items].sort(
    (a, b) =>
      a.faculty_name.localeCompare(b.faculty_name, "th") ||
      a.department_name.localeCompare(b.department_name, "th"),
  );

export default function DepartmentManagementClient() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculties, setFaculties] = useState<FacultyOption[]>([]);
  const [facultyId, setFacultyId] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const activeFaculties = faculties.filter((faculty) => faculty.is_active);
  const selectableFaculties = faculties.filter(
    (faculty) =>
      faculty.is_active || faculty.faculty_id === editingDepartment?.faculty_id,
  );

  const resetForm = () => {
    setEditingDepartment(null);
    setFacultyId("");
    setDepartmentCode("");
    setDepartmentName("");
  };

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await academicUnitManagementService.getDepartments();
      setDepartments(sortDepartments(response.departments));
      setFaculties(response.faculties);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "ไม่สามารถโหลดข้อมูลสาขาได้",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    academicUnitManagementService
      .getDepartments()
      .then((response) => {
        if (active) {
          setDepartments(sortDepartments(response.departments));
          setFaculties(response.faculties);
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "ไม่สามารถโหลดข้อมูลสาขาได้",
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

  const beginEdit = (department: Department) => {
    setEditingDepartment(department);
    setFacultyId(String(department.faculty_id));
    setDepartmentCode(department.department_code);
    setDepartmentName(department.department_name);
    setError("");
    setNotice("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedFacultyId = Number(facultyId);
    if (!Number.isInteger(selectedFacultyId) || selectedFacultyId <= 0) {
      setError("กรุณาเลือกคณะ");
      return;
    }

    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const payload = {
        faculty_id: selectedFacultyId,
        department_code: departmentCode.trim(),
        department_name: departmentName.trim(),
      };
      if (editingDepartment) {
        const response = await academicUnitManagementService.updateDepartment(
          editingDepartment.department_id,
          payload,
        );
        setDepartments((current) =>
          sortDepartments(
            current.map((department) =>
              department.department_id === response.department.department_id
                ? response.department
                : department,
            ),
          ),
        );
        setNotice(`แก้ไขสาขา ${response.department.department_name} แล้ว`);
      } else {
        const response = await academicUnitManagementService.createDepartment(payload);
        setDepartments((current) =>
          sortDepartments([...current, response.department]),
        );
        setNotice(`เพิ่มสาขา ${response.department.department_name} แล้ว`);
      }
      resetForm();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ไม่สามารถบันทึกสาขาได้",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (department: Department) => {
    const nextStatus = !department.is_active;
    const confirmed = window.confirm(
      nextStatus
        ? `ต้องการเปิดใช้งานสาขา ${department.department_name} อีกครั้งหรือไม่?`
        : `ต้องการปิดใช้งานสาขา ${department.department_name} หรือไม่?`,
    );
    if (!confirmed) return;

    setError("");
    setNotice("");
    setStatusUpdatingId(department.department_id);
    try {
      const response = await academicUnitManagementService.setDepartmentStatus(
        department.department_id,
        nextStatus,
      );
      setDepartments((current) =>
        current.map((item) =>
          item.department_id === response.department.department_id
            ? response.department
            : item,
        ),
      );
      setNotice(
        `${nextStatus ? "เปิด" : "ปิด"}ใช้งานสาขา ${response.department.department_name} แล้ว`,
      );
      if (editingDepartment?.department_id === department.department_id) resetForm();
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "ไม่สามารถเปลี่ยนสถานะสาขาได้",
      );
    } finally {
      setStatusUpdatingId(null);
    }
  };

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[380px_1fr]">
      <form
        onSubmit={handleSubmit}
        className="h-fit rounded-[24px] border border-[#dce9ed] bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-[#e9f7fb] p-3 text-[#4b91aa]">
            <Building2 size={22} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-[#314750]">
              {editingDepartment ? "แก้ไขสาขา" : "เพิ่มสาขาใหม่"}
            </h2>
            <p className="text-xs text-[#81939a]">ต้องเลือกคณะที่สาขาสังกัด</p>
          </div>
        </div>

        <label className="mt-6 block text-sm text-[#526b75]" htmlFor="department-faculty">
          คณะ
        </label>
        <select
          id="department-faculty"
          value={facultyId}
          onChange={(event) => setFacultyId(event.target.value)}
          required
          disabled={selectableFaculties.length === 0}
          className="mt-2 h-11 w-full rounded-xl border border-[#d5e2e6] bg-white px-3 text-sm text-[#526b75] outline-none focus:border-[#66a8bf] disabled:cursor-not-allowed disabled:bg-gray-100"
        >
          <option value="">เลือกคณะ</option>
          {selectableFaculties.map((faculty) => (
            <option key={faculty.faculty_id} value={faculty.faculty_id}>
              {faculty.faculty_name} ({faculty.faculty_code})
              {faculty.is_active ? "" : " (ปิดใช้งาน)"}
            </option>
          ))}
        </select>
        {activeFaculties.length === 0 && !editingDepartment && !loading && (
          <p className="mt-2 text-xs text-[#b66a55]">
            ยังไม่มีคณะที่เปิดใช้งาน กรุณาเพิ่มหรือเปิดใช้งานคณะก่อน
          </p>
        )}

        <label className="mt-4 block text-sm text-[#526b75]" htmlFor="department-code">
          ตัวย่อสาขาภาษาอังกฤษ
        </label>
        <input
          id="department-code"
          value={departmentCode}
          onChange={(event) => setDepartmentCode(event.target.value.toUpperCase())}
          maxLength={20}
          required
          placeholder="เช่น CS"
          className="mt-2 h-11 w-full rounded-xl border border-[#d5e2e6] px-3 text-sm text-[#314750] placeholder:text-[#9aa9ae] outline-none focus:border-[#66a8bf]"
        />

        <label className="mt-4 block text-sm text-[#526b75]" htmlFor="department-name">
          ชื่อสาขา
        </label>
        <input
          id="department-name"
          value={departmentName}
          onChange={(event) => setDepartmentName(event.target.value)}
          maxLength={150}
          required
          placeholder="เช่น วิทยาการคอมพิวเตอร์"
          className="mt-2 h-11 w-full rounded-xl border border-[#d5e2e6] px-3 text-sm text-[#314750] placeholder:text-[#9aa9ae] outline-none focus:border-[#66a8bf]"
        />

        <button
          type="submit"
          disabled={
            submitting || (!editingDepartment && activeFaculties.length === 0)
          }
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#4d94ad] text-sm font-medium text-white transition hover:bg-[#40839a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <LoaderCircle className="animate-spin" size={17} />
          ) : editingDepartment ? (
            <Pencil size={17} />
          ) : (
            <Plus size={17} />
          )}
          {editingDepartment ? "บันทึกการแก้ไข" : "เพิ่มสาขา"}
        </button>
        {editingDepartment && (
          <button
            type="button"
            onClick={resetForm}
            disabled={submitting}
            className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#d8e6ea] text-sm text-[#617880] hover:bg-[#f6fafb] disabled:opacity-60"
          >
            <X size={16} /> ยกเลิกแก้ไข
          </button>
        )}
      </form>

      <section className="overflow-hidden rounded-[24px] border border-[#dce9ed] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#e6eef1] px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-semibold text-[#314750]">สาขาที่มีอยู่</h2>
            <p className="mt-1 text-xs text-[#81939a]">ทั้งหมด {departments.length} สาขา</p>
          </div>
          <button
            type="button"
            onClick={() => void loadDepartments()}
            className="rounded-xl border border-[#d8e6ea] p-2.5 text-[#5b8797] hover:bg-[#f3fafc]"
            aria-label="โหลดข้อมูลสาขาใหม่"
          >
            <RefreshCw size={17} />
          </button>
        </div>

        {(error || notice) && (
          <div
            className={`mx-5 mt-4 rounded-xl px-4 py-3 text-sm sm:mx-6 ${
              error ? "bg-[#fff0ec] text-[#b85e49]" : "bg-[#eefaf4] text-[#39785f]"
            }`}
            role={error ? "alert" : "status"}
          >
            {error || notice}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-72 items-center justify-center gap-3 text-sm text-[#718890]">
            <LoaderCircle className="animate-spin" size={22} /> กำลังโหลดข้อมูลสาขา...
          </div>
        ) : departments.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-5 text-center text-[#718890]">
            <AlertCircle size={28} className="mb-3 text-[#7aa9b9]" />
            <p className="font-medium">ยังไม่มีข้อมูลสาขา</p>
            <p className="mt-1 text-sm">เพิ่มคณะก่อน แล้วจึงเพิ่มสาขาได้จากแบบฟอร์ม</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#f7fafb] text-[#6f838b]">
                <tr>
                  <th className="px-6 py-3 font-medium">ตัวย่อสาขา</th>
                  <th className="px-6 py-3 font-medium">ชื่อสาขา</th>
                  <th className="px-6 py-3 font-medium">คณะ</th>
                  <th className="px-6 py-3 text-center font-medium">สถานะ</th>
                  <th className="px-6 py-3 text-center font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2f4]">
                {departments.map((department) => (
                  <tr key={department.department_id} className="text-[#405861]">
                    <td className="px-6 py-4 font-medium text-[#377d97]">
                      {department.department_code}
                    </td>
                    <td className="px-6 py-4 font-medium text-[#405861]">
                      {department.department_name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="block">{department.faculty_name}</span>
                      <span className="text-xs text-[#8a9ba2]">
                        {department.faculty_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          department.is_active
                            ? "bg-[#eaf8f1] text-[#438064]"
                            : "bg-[#f1f3f4] text-[#77878d]"
                        }`}
                      >
                        {department.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => beginEdit(department)}
                          disabled={statusUpdatingId === department.department_id}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#cfe0e6] px-2.5 py-1.5 text-xs text-[#477b8e] hover:bg-[#f1f8fa] disabled:opacity-50"
                        >
                          <Pencil size={14} /> แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleStatusChange(department)}
                          disabled={statusUpdatingId === department.department_id}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs disabled:opacity-50 ${
                            department.is_active
                              ? "border-[#efd4cd] text-[#a96050] hover:bg-[#fff4f1]"
                              : "border-[#cce7d9] text-[#39785f] hover:bg-[#eefaf4]"
                          }`}
                        >
                          {statusUpdatingId === department.department_id ? (
                            <LoaderCircle className="animate-spin" size={14} />
                          ) : department.is_active ? (
                            <Power size={14} />
                          ) : (
                            <RotateCcw size={14} />
                          )}
                          {department.is_active ? "ปิดใช้" : "เปิดใช้"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
