"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Landmark,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import type { Faculty } from "@/interfaces/academic-unit.interface";
import { academicUnitManagementService } from "@/services/academic-unit-management.service";

const sortFaculties = (items: Faculty[]) =>
  [...items].sort((a, b) => a.faculty_name.localeCompare(b.faculty_name, "th"));

export default function FacultyManagementClient() {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [facultyCode, setFacultyCode] = useState("");
  const [facultyName, setFacultyName] = useState("");
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const resetForm = () => {
    setEditingFaculty(null);
    setFacultyCode("");
    setFacultyName("");
  };

  const loadFaculties = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await academicUnitManagementService.getFaculties();
      setFaculties(sortFaculties(response.faculties));
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดข้อมูลคณะได้",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    academicUnitManagementService
      .getFaculties()
      .then((response) => {
        if (active) setFaculties(sortFaculties(response.faculties));
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "ไม่สามารถโหลดข้อมูลคณะได้",
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

  const beginEdit = (faculty: Faculty) => {
    setEditingFaculty(faculty);
    setFacultyCode(faculty.faculty_code);
    setFacultyName(faculty.faculty_name);
    setError("");
    setNotice("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const payload = {
        faculty_code: facultyCode.trim(),
        faculty_name: facultyName.trim(),
      };
      if (editingFaculty) {
        const response = await academicUnitManagementService.updateFaculty(
          editingFaculty.faculty_id,
          payload,
        );
        setFaculties((current) =>
          sortFaculties(
            current.map((faculty) =>
              faculty.faculty_id === response.faculty.faculty_id
                ? response.faculty
                : faculty,
            ),
          ),
        );
        setNotice(`แก้ไขคณะ ${response.faculty.faculty_name} แล้ว`);
      } else {
        const response = await academicUnitManagementService.createFaculty(payload);
        setFaculties((current) => sortFaculties([...current, response.faculty]));
        setNotice(`เพิ่มคณะ ${response.faculty.faculty_name} แล้ว`);
      }
      resetForm();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "ไม่สามารถบันทึกคณะได้",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (faculty: Faculty) => {
    const nextStatus = !faculty.is_active;
    const confirmed = window.confirm(
      nextStatus
        ? `ต้องการเปิดใช้งานคณะ ${faculty.faculty_name} อีกครั้งหรือไม่?`
        : `ต้องการปิดใช้งานคณะ ${faculty.faculty_name} หรือไม่? ต้องปิดสาขาที่ใช้งานอยู่ทั้งหมดก่อน`,
    );
    if (!confirmed) return;

    setError("");
    setNotice("");
    setStatusUpdatingId(faculty.faculty_id);
    try {
      const response = await academicUnitManagementService.setFacultyStatus(
        faculty.faculty_id,
        nextStatus,
      );
      setFaculties((current) =>
        current.map((item) =>
          item.faculty_id === response.faculty.faculty_id ? response.faculty : item,
        ),
      );
      setNotice(
        `${nextStatus ? "เปิด" : "ปิด"}ใช้งานคณะ ${response.faculty.faculty_name} แล้ว`,
      );
      if (editingFaculty?.faculty_id === faculty.faculty_id) resetForm();
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "ไม่สามารถเปลี่ยนสถานะคณะได้",
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
            <Landmark size={22} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-[#314750]">
              {editingFaculty ? "แก้ไขคณะ" : "เพิ่มคณะใหม่"}
            </h2>
            <p className="text-xs text-[#81939a]">กรอกตัวย่อภาษาอังกฤษและชื่อคณะ</p>
          </div>
        </div>

        <label className="mt-6 block text-sm text-[#526b75]" htmlFor="faculty-code">
          ตัวย่อคณะภาษาอังกฤษ
        </label>
        <input
          id="faculty-code"
          value={facultyCode}
          onChange={(event) => setFacultyCode(event.target.value.toUpperCase())}
          maxLength={20}
          required
          placeholder="เช่น SCI"
          className="mt-2 h-11 w-full rounded-xl border border-[#d5e2e6] px-3 text-sm text-[#314750] placeholder:text-[#9aa9ae] outline-none focus:border-[#66a8bf]"
        />

        <label className="mt-4 block text-sm text-[#526b75]" htmlFor="faculty-name">
          ชื่อคณะ
        </label>
        <input
          id="faculty-name"
          value={facultyName}
          onChange={(event) => setFacultyName(event.target.value)}
          maxLength={150}
          required
          placeholder="เช่น คณะวิทยาศาสตร์"
          className="mt-2 h-11 w-full rounded-xl border border-[#d5e2e6] px-3 text-sm text-[#314750] placeholder:text-[#9aa9ae] outline-none focus:border-[#66a8bf]"
        />

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#4d94ad] text-sm font-medium text-white transition hover:bg-[#40839a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <LoaderCircle className="animate-spin" size={17} />
          ) : editingFaculty ? (
            <Pencil size={17} />
          ) : (
            <Plus size={17} />
          )}
          {editingFaculty ? "บันทึกการแก้ไข" : "เพิ่มคณะ"}
        </button>
        {editingFaculty && (
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
            <h2 className="font-semibold text-[#314750]">คณะที่มีอยู่</h2>
            <p className="mt-1 text-xs text-[#81939a]">ทั้งหมด {faculties.length} คณะ</p>
          </div>
          <button
            type="button"
            onClick={() => void loadFaculties()}
            className="rounded-xl border border-[#d8e6ea] p-2.5 text-[#5b8797] hover:bg-[#f3fafc]"
            aria-label="โหลดข้อมูลคณะใหม่"
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
            <LoaderCircle className="animate-spin" size={22} /> กำลังโหลดข้อมูลคณะ...
          </div>
        ) : faculties.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-5 text-center text-[#718890]">
            <AlertCircle size={28} className="mb-3 text-[#7aa9b9]" />
            <p className="font-medium">ยังไม่มีข้อมูลคณะ</p>
            <p className="mt-1 text-sm">เพิ่มคณะแรกได้จากแบบฟอร์มด้านซ้าย</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-[#f7fafb] text-[#6f838b]">
                <tr>
                  <th className="px-6 py-3 font-medium">ตัวย่อคณะ</th>
                  <th className="px-6 py-3 font-medium">ชื่อคณะ</th>
                  <th className="px-6 py-3 text-center font-medium">จำนวนสาขา</th>
                  <th className="px-6 py-3 text-center font-medium">สถานะ</th>
                  <th className="px-6 py-3 text-center font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2f4]">
                {faculties.map((faculty) => (
                  <tr key={faculty.faculty_id} className="text-[#405861]">
                    <td className="px-6 py-4 font-medium text-[#377d97]">
                      {faculty.faculty_code}
                    </td>
                    <td className="px-6 py-4 font-medium text-[#405861]">
                      {faculty.faculty_name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="block">{faculty.department_count}</span>
                      <span className="text-xs text-[#8a9ba2]">
                        เปิดใช้ {faculty.active_department_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          faculty.is_active
                            ? "bg-[#eaf8f1] text-[#438064]"
                            : "bg-[#f1f3f4] text-[#77878d]"
                        }`}
                      >
                        {faculty.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => beginEdit(faculty)}
                          disabled={statusUpdatingId === faculty.faculty_id}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#cfe0e6] px-2.5 py-1.5 text-xs text-[#477b8e] hover:bg-[#f1f8fa] disabled:opacity-50"
                        >
                          <Pencil size={14} /> แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleStatusChange(faculty)}
                          disabled={statusUpdatingId === faculty.faculty_id}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs disabled:opacity-50 ${
                            faculty.is_active
                              ? "border-[#efd4cd] text-[#a96050] hover:bg-[#fff4f1]"
                              : "border-[#cce7d9] text-[#39785f] hover:bg-[#eefaf4]"
                          }`}
                        >
                          {statusUpdatingId === faculty.faculty_id ? (
                            <LoaderCircle className="animate-spin" size={14} />
                          ) : faculty.is_active ? (
                            <Power size={14} />
                          ) : (
                            <RotateCcw size={14} />
                          )}
                          {faculty.is_active ? "ปิดใช้" : "เปิดใช้"}
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
