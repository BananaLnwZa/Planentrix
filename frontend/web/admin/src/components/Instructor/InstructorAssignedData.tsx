"use client";

import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  GraduationCap,
  LoaderCircle,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  InstructorAssignedSection,
  InstructorWorkspaceResponse,
} from "@/interfaces/instructor-workspace.interface";
import { instructorWorkspaceService } from "@/services/instructor-workspace.service";
import AdminSelect from "@/components/ui/AdminSelect";

interface InstructorAssignedDataProps {
  mode: "subjects" | "students";
}

const roleLabel = (role: InstructorAssignedSection["instructor_role"]) =>
  role === "owner" ? "อาจารย์เจ้าของวิชา" : "อาจารย์ผู้สอนร่วม";

export default function InstructorAssignedData({ mode }: InstructorAssignedDataProps) {
  const [workspace, setWorkspace] = useState<InstructorWorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");

  useEffect(() => {
    let active = true;
    instructorWorkspaceService
      .getDashboard()
      .then((response) => {
        if (active) setWorkspace(response);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดข้อมูลได้");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const sections = useMemo(() => workspace?.sections ?? [], [workspace]);
  const students = useMemo(() => workspace?.students ?? [], [workspace]);
  const filteredStudents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("th");
    return students.filter((student) => {
      const fullName = `${student.first_name} ${student.last_name}`.toLocaleLowerCase("th");
      return (
        (sectionFilter === "all" || student.section_id === Number(sectionFilter)) &&
        (!query ||
          fullName.includes(query) ||
          student.user_name.toLocaleLowerCase().includes(query) ||
          String(student.user_id).includes(query))
      );
    });
  }, [search, sectionFilter, students]);

  if (loading) {
    return <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-[28px] border border-white/85 bg-white/80 text-[#66808b] shadow-sm"><LoaderCircle className="animate-spin text-[#5794aa]" size={30} /><p className="text-sm">กำลังโหลดข้อมูลที่ได้รับมอบหมาย...</p></div>;
  }
  if (error) {
    return <div className="flex min-h-72 flex-col items-center justify-center rounded-[28px] border border-[#efd8d2] bg-white/85 px-6 text-center"><span className="rounded-full bg-[#fff0ec] p-4 text-[#bd654f]"><AlertCircle size={26} /></span><p className="mt-4 font-medium text-[#405862]">โหลดข้อมูลไม่สำเร็จ</p><p className="mt-1 text-sm text-[#82939a]">{error}</p></div>;
  }

  if (mode === "subjects") {
    return (
      <div>
        <section className="rounded-[28px] border border-white/85 bg-white/80 p-6 shadow-[0_18px_55px_rgba(74,111,132,0.1)] backdrop-blur-xl sm:p-8">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#e4f5fa] text-[#4f879c]"><BookOpen aria-hidden="true" size={25} strokeWidth={1.8} /></div>
          <p className="mt-5 text-sm font-medium text-[#4f879c]">Assigned Sections</p>
          <h2 className="mt-1 text-2xl text-[#304b56]">รายวิชาที่รับผิดชอบ</h2>
          <p className="mt-2 text-sm leading-6 text-[#7a8b92]">แสดงเฉพาะกลุ่มเรียนที่เจ้าหน้าที่มอบหมายให้อาจารย์ผ่านระบบการเปิดสอน</p>
        </section>
        {sections.length === 0 ? (
          <div className="mt-5 flex min-h-60 flex-col items-center justify-center rounded-[26px] border border-dashed border-[#cfe0e6] bg-white/70 px-6 text-center"><GraduationCap className="text-[#75a2b2]" size={30} /><p className="mt-3 font-medium text-[#405862]">ยังไม่มีกลุ่มเรียนที่ได้รับมอบหมาย</p><p className="mt-1 text-sm text-[#82939a]">เมื่อเจ้าหน้าที่เปิดกลุ่มเรียนและเลือกอาจารย์ รายวิชาจะปรากฏที่นี่</p></div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {sections.map((section) => (
              <article key={section.section_id} className="rounded-[24px] border border-white/90 bg-white/85 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-[#6291a2]">{section.subject_id} · กลุ่ม {section.section_number}</p><h3 className="mt-1 text-lg font-semibold text-[#304b56]">{section.subject_name}</h3></div><span className="rounded-full bg-[#f0eef9] px-3 py-1.5 text-xs text-[#6d619d]">{roleLabel(section.instructor_role)}</span></div>
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-[#f7fbfc] p-4 text-sm text-[#536b75]"><span className="flex items-center gap-2"><CalendarDays size={16} className="text-[#6e9dad]" />ปี {section.academic_year} · เทอม {section.semester_no}</span><span className="flex items-center gap-2"><UsersRound size={16} className="text-[#7468a8]" />{section.student_count} คน</span></div>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <section className="rounded-[28px] border border-white/85 bg-white/80 p-6 shadow-[0_18px_55px_rgba(74,111,132,0.1)] backdrop-blur-xl sm:p-8">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#e4f5fa] text-[#4f879c]"><UsersRound aria-hidden="true" size={25} strokeWidth={1.8} /></div>
        <p className="mt-5 text-sm font-medium text-[#4f879c]">Students</p>
        <h2 className="mt-1 text-2xl text-[#304b56]">นักศึกษาในกลุ่มเรียน</h2>
        <p className="mt-2 text-sm leading-6 text-[#7a8b92]">รายชื่อนักศึกษาจาก enrollment ของกลุ่มเรียนที่อาจารย์ได้รับมอบหมาย</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_280px]">
          <label className="relative"><span className="sr-only">ค้นหานักศึกษา</span><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7f969f]" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อหรือชื่อผู้ใช้" className="h-12 w-full rounded-2xl border border-[#d5e3e7] bg-white pl-11 pr-4 text-sm text-[#405862] outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]" /></label>
          <AdminSelect value={sectionFilter} onChange={setSectionFilter} options={[{ value: "all", label: "ทุกกลุ่มเรียน" }, ...sections.map((section) => ({ value: String(section.section_id), label: `${section.subject_id} · กลุ่ม ${section.section_number}` }))]} ariaLabel="กรองกลุ่มเรียน" appearance="cute" icon={BookOpen} />
        </div>
      </section>
      {filteredStudents.length === 0 ? (
        <div className="mt-5 flex min-h-56 flex-col items-center justify-center rounded-[26px] border border-dashed border-[#cfe0e6] bg-white/70 px-6 text-center"><UserRound className="text-[#75a2b2]" size={30} /><p className="mt-3 font-medium text-[#405862]">ยังไม่มีนักศึกษาในรายการนี้</p><p className="mt-1 text-sm text-[#82939a]">นักศึกษาจะปรากฏเมื่อมีการลงทะเบียนในกลุ่มเรียน</p></div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-[24px] border border-white/90 bg-white/85 shadow-sm"><div className="divide-y divide-[#e8eef0]">{filteredStudents.map((student) => (<div key={`${student.section_id}-${student.user_id}`} className="flex items-center gap-4 px-5 py-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e8f5f9] text-[#4e879b]"><UserRound size={18} /></span><div className="min-w-0 flex-1"><p className="truncate font-medium text-[#405862]">{`${student.first_name} ${student.last_name}`.trim() || student.user_name}</p><p className="mt-0.5 text-xs text-[#8a9aa1]">{student.user_name}</p></div><span className="shrink-0 rounded-full bg-[#f0eef9] px-3 py-1.5 text-xs text-[#6d619d]">{student.subject_id} · กลุ่ม {student.section_number}</span></div>))}</div></div>
      )}
    </div>
  );
}
