"use client";

import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  Search,
  Target,
  TrendingDown,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import AdminSelect from "@/components/ui/AdminSelect";
import type {
  InstructorAssignedSection,
  InstructorWorkspaceResponse,
} from "@/interfaces/instructor-workspace.interface";

interface InstructorSubjectGroupsProps {
  workspace: InstructorWorkspaceResponse;
}

type DetailTab = "overview" | "students" | "results" | "weaknesses";

interface SubjectGroup {
  key: string;
  subject_id: string;
  subject_name: string;
  academic_term_id: number;
  academic_year: number;
  semester_no: number;
  sections: InstructorAssignedSection[];
}

const roleLabel = (role: InstructorAssignedSection["instructor_role"]) =>
  role === "owner" ? "เจ้าของวิชา" : "ผู้สอนร่วม";

const periodLabel = (period: "midterm" | "final") =>
  period === "midterm" ? "กลางภาค" : "ปลายภาค";

const tabs: Array<{
  value: DetailTab;
  label: string;
  icon: typeof BookOpen;
}> = [
  { value: "overview", label: "ภาพรวม", icon: BookOpen },
  { value: "students", label: "รายชื่อนักศึกษา", icon: UsersRound },
  { value: "results", label: "ผลสอบ", icon: BarChart3 },
  { value: "weaknesses", label: "จุดอ่อน", icon: TrendingDown },
];

export default function InstructorSubjectGroups({
  workspace,
}: InstructorSubjectGroupsProps) {
  const [search, setSearch] = useState("");
  const [termFilter, setTermFilter] = useState("all");
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(
    workspace.sections[0]?.section_id ?? null,
  );
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  const termOptions = useMemo(() => {
    const terms = new Map<number, string>();
    for (const section of workspace.sections) {
      terms.set(
        section.academic_term_id,
        `ปี ${section.academic_year} · ภาคเรียน ${section.semester_no}`,
      );
    }
    return [
      { value: "all", label: "ทุกภาคเรียน" },
      ...[...terms.entries()].map(([termId, label]) => ({
        value: String(termId),
        label,
      })),
    ];
  }, [workspace.sections]);

  const subjectGroups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("th");
    const grouped = new Map<string, SubjectGroup>();
    for (const section of workspace.sections) {
      if (
        termFilter !== "all" &&
        section.academic_term_id !== Number(termFilter)
      ) {
        continue;
      }
      if (
        query &&
        !`${section.subject_id} ${section.subject_name} ${section.section_number}`
          .toLocaleLowerCase("th")
          .includes(query)
      ) {
        continue;
      }
      const key = `${section.academic_term_id}-${section.subject_id}`;
      const group = grouped.get(key) ?? {
        key,
        subject_id: section.subject_id,
        subject_name: section.subject_name,
        academic_term_id: section.academic_term_id,
        academic_year: section.academic_year,
        semester_no: section.semester_no,
        sections: [],
      };
      group.sections.push(section);
      grouped.set(key, group);
    }
    return [...grouped.values()];
  }, [search, termFilter, workspace.sections]);

  const selectedSection = workspace.sections.find(
    (section) => section.section_id === selectedSectionId,
  );
  const sectionStudents = workspace.students.filter(
    (student) => student.section_id === selectedSectionId,
  );
  const sectionResults = workspace.exam_results.filter(
    (result) => result.section_id === selectedSectionId,
  );
  const sectionWeakTopics = workspace.weak_topics.filter(
    (topic) => topic.section_id === selectedSectionId,
  );

  const selectSection = (sectionId: number) => {
    setSelectedSectionId(sectionId);
    setActiveTab("overview");
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/85 bg-white/80 p-6 shadow-[0_18px_55px_rgba(74,111,132,0.1)] backdrop-blur-xl sm:p-8">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#e4f5fa] text-[#4f879c]">
          <BookOpen aria-hidden="true" size={25} strokeWidth={1.8} />
        </div>
        <p className="mt-5 text-sm font-medium text-[#4f879c]">Subjects & Sections</p>
        <h2 className="mt-1 text-2xl text-[#304b56]">วิชาและกลุ่มเรียน</h2>
        <p className="mt-2 text-sm leading-6 text-[#7a8b92]">
          รายวิชาเป็นข้อมูลหลัก และแสดงกลุ่มเรียนที่ได้รับมอบหมายอยู่ภายในแต่ละวิชา
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_280px]">
          <label className="relative">
            <span className="sr-only">ค้นหาวิชาและกลุ่มเรียน</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7f969f]" size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหารหัสวิชา ชื่อวิชา หรือกลุ่ม" className="h-12 w-full rounded-2xl border border-[#d5e3e7] bg-white pl-11 pr-4 text-sm text-[#405862] outline-none transition focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]" />
          </label>
          <AdminSelect value={termFilter} onChange={setTermFilter} options={termOptions} ariaLabel="กรองภาคเรียน" appearance="cute" icon={CalendarDays} />
        </div>
      </section>

      {workspace.sections.length === 0 ? (
        <EmptyState icon={GraduationCap} title="ยังไม่มีกลุ่มเรียนที่ได้รับมอบหมาย" description="เมื่อเจ้าหน้าที่เปิดกลุ่มเรียนและเลือกอาจารย์ รายวิชาจะปรากฏที่นี่" />
      ) : subjectGroups.length === 0 ? (
        <EmptyState icon={Search} title="ไม่พบวิชาและกลุ่มเรียน" description="ลองเปลี่ยนคำค้นหาหรือตัวกรองภาคเรียน" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {subjectGroups.map((group) => (
            <article key={group.key} className="rounded-[26px] border border-white/90 bg-white/85 p-5 shadow-[0_12px_35px_rgba(70,103,116,0.08)]">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#e7f5f9] text-[#51869a]"><BookOpen size={21} /></span>
                <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-[#5b8da0]">{group.subject_id}</p><h3 className="mt-1 truncate text-lg font-semibold text-[#304b56]">{group.subject_name}</h3><p className="mt-1 text-xs text-[#8a999f]">ปี {group.academic_year} · ภาคเรียน {group.semester_no} · {group.sections.length} กลุ่ม</p></div>
              </div>
              <div className="mt-4 space-y-2 border-t border-[#e7eef0] pt-4">
                {group.sections.map((section) => {
                  const selected = section.section_id === selectedSectionId;
                  return (
                    <button key={section.section_id} type="button" onClick={() => selectSection(section.section_id)} className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${selected ? "border-[#a9d2df] bg-[#ebf7fa] shadow-sm" : "border-[#e3ebee] bg-[#fafcfd] hover:border-[#bfd9e2] hover:bg-white"}`}>
                      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${selected ? "bg-white text-[#4d8498]" : "bg-[#edf3f5] text-[#657c85]"}`}>{section.section_number}</span>
                      <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-[#405862]">กลุ่ม {section.section_number}</span><span className="mt-0.5 block text-xs text-[#84949a]">{section.student_count} คน · {roleLabel(section.instructor_role)}</span></span>
                      <ChevronRight size={18} className={selected ? "text-[#518ba0]" : "text-[#9aa8ad]"} />
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedSection && (
        <section className="overflow-hidden rounded-[28px] border border-white/90 bg-white/85 shadow-[0_16px_48px_rgba(68,103,117,0.09)]">
          <div className="flex flex-col gap-3 border-b border-[#e3ebee] bg-[linear-gradient(135deg,#f3fbfd_0%,#f7f4fc_100%)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div><p className="text-xs font-semibold text-[#5f8fa0]">{selectedSection.subject_id} · กลุ่ม {selectedSection.section_number}</p><h3 className="mt-1 text-xl font-semibold text-[#304b56]">{selectedSection.subject_name}</h3></div>
            <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs text-[#6a5f99] shadow-sm">{roleLabel(selectedSection.instructor_role)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-[#e5edef] bg-white p-2 sm:grid-cols-4">
            {tabs.map(({ value, label, icon: Icon }) => (
              <button key={value} type="button" onClick={() => setActiveTab(value)} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-medium transition ${activeTab === value ? "bg-[#e9f6fa] text-[#477f93] shadow-sm" : "text-[#71838b] hover:bg-[#f3f7f8]"}`}><Icon size={17} />{label}</button>
            ))}
          </div>

          <div className="p-5 sm:p-7">
            {activeTab === "overview" && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric icon={UsersRound} label="นักศึกษา" value={`${selectedSection.student_count} คน`} tone="blue" />
                <Metric icon={BarChart3} label="ผลสอบที่ส่งแล้ว" value={`${sectionResults.length} ครั้ง`} tone="violet" />
                <Metric icon={TrendingDown} label="จุดอ่อนที่พบ" value={`${sectionWeakTopics.length} รายการ`} tone="orange" />
                <Metric icon={CalendarDays} label="ภาคเรียน" value={`${selectedSection.academic_year}/${selectedSection.semester_no}`} tone="green" />
              </div>
            )}

            {activeTab === "students" && (
              sectionStudents.length ? <div className="divide-y divide-[#e8eef0] overflow-hidden rounded-[22px] border border-[#e1eaed] bg-white">{sectionStudents.map((student) => <div key={student.user_id} className="flex items-center gap-4 px-4 py-3.5 sm:px-5"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e8f5f9] text-[#4e879b]"><UserRound size={18} /></span><div className="min-w-0 flex-1"><p className="truncate font-medium text-[#405862]">{`${student.first_name} ${student.last_name}`.trim() || student.user_name}</p><p className="mt-0.5 text-xs text-[#8a9aa1]">{student.user_name}</p></div><span className="rounded-full bg-[#edf7f1] px-3 py-1 text-xs text-[#4e8067]">กำลังเรียน</span></div>)}</div> : <EmptyPanel icon={UsersRound} title="ยังไม่มีนักศึกษาในกลุ่มนี้" />
            )}

            {activeTab === "results" && (
              sectionResults.length ? <div className="space-y-3">{sectionResults.map((result) => <article key={result.exam_attempt_id} className="flex flex-col gap-3 rounded-[20px] border border-[#e1eaed] bg-white p-4 sm:flex-row sm:items-center"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#eeeafa] text-[#7165a2]"><ClipboardList size={20} /></span><div className="min-w-0 flex-1"><p className="font-medium text-[#3e555f]">{`${result.first_name} ${result.last_name}`.trim() || result.user_name}</p><p className="mt-1 text-xs text-[#87979e]">{periodLabel(result.exam_period)} · ส่งเมื่อ {new Date(result.submitted_at).toLocaleString("th-TH")}</p></div><div className="text-left sm:text-right"><p className="text-lg font-semibold text-[#4d8093]">{result.actual_score}/{result.max_score}</p><p className="text-xs text-[#82939a]">{result.percentage.toFixed(2)}% · จุดอ่อน {result.weak_topic_count}</p></div></article>)}</div> : <EmptyPanel icon={BarChart3} title="ยังไม่มีผลสอบที่ส่งแล้ว" />
            )}

            {activeTab === "weaknesses" && (
              sectionWeakTopics.length ? <div className="grid gap-3 md:grid-cols-2">{sectionWeakTopics.map((topic) => <article key={topic.bank_result_id} className="rounded-[20px] border border-[#f0ded5] bg-[#fffaf7] p-4"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff0e8] text-[#c87655]"><Target size={19} /></span><div className="min-w-0"><p className="font-medium text-[#5c4c45]">{topic.bank_name}</p><p className="mt-1 text-xs text-[#957f75]">{`${topic.first_name} ${topic.last_name}`.trim() || topic.user_name} · {periodLabel(topic.exam_period)}</p></div></div><div className="mt-3 flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm"><span className="text-[#806e66]">{topic.actual_score}/{topic.max_score} คะแนน</span><strong className="text-[#bd684b]">{topic.percentage.toFixed(2)}%</strong></div></article>)}</div> : <EmptyPanel icon={TrendingDown} title="ยังไม่พบจุดอ่อนในกลุ่มนี้" />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof BookOpen; title: string; description: string }) {
  return <div className="flex min-h-60 flex-col items-center justify-center rounded-[26px] border border-dashed border-[#cfe0e6] bg-white/70 px-6 text-center"><Icon className="text-[#75a2b2]" size={30} /><p className="mt-3 font-medium text-[#405862]">{title}</p><p className="mt-1 text-sm text-[#82939a]">{description}</p></div>;
}

function EmptyPanel({ icon: Icon, title }: { icon: typeof BookOpen; title: string }) {
  return <div className="flex min-h-48 flex-col items-center justify-center rounded-[22px] border border-dashed border-[#d1e0e5] bg-[#f9fbfc] text-center"><Icon className="text-[#84a4b0]" size={27} /><p className="mt-3 text-sm font-medium text-[#607680]">{title}</p></div>;
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof BookOpen; label: string; value: string; tone: "blue" | "violet" | "orange" | "green" }) {
  const styles = { blue: "bg-[#e7f5f9] text-[#4e879b]", violet: "bg-[#eeeafa] text-[#7165a2]", orange: "bg-[#fff0e8] text-[#c87655]", green: "bg-[#e9f6ef] text-[#56836d]" };
  return <div className="rounded-[22px] border border-[#e4ecef] bg-white p-4"><span className={`flex size-10 items-center justify-center rounded-2xl ${styles[tone]}`}><Icon size={19} /></span><p className="mt-4 text-xs text-[#87979e]">{label}</p><p className="mt-1 text-xl font-semibold text-[#3d555f]">{value}</p></div>;
}
