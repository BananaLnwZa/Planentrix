"use client";

import { Clock3, LoaderCircle, MapPin, UserRound, UsersRound } from "lucide-react";
import type {
  AvailableCourseSection,
  AvailableTermSubject,
} from "@/interfaces/term.interface";

const dayLabels: Record<string, string> = {
  monday: "จ.",
  tuesday: "อ.",
  wednesday: "พ.",
  thursday: "พฤ.",
  friday: "ศ.",
  saturday: "ส.",
  sunday: "อา.",
};

const instructorName = (
  instructor: AvailableCourseSection["instructors"][number],
) =>
  `${instructor.first_name} ${instructor.last_name}`.trim() ||
  instructor.admin_name;

export default function TermSectionPicker({
  subjects,
  selectedSectionIds,
  loading,
  error,
  ready,
  onSelect,
}: {
  subjects: AvailableTermSubject[];
  selectedSectionIds: Record<string, number>;
  loading: boolean;
  error: string;
  ready: boolean;
  onSelect: (subjectId: string, sectionId: number) => void;
}) {
  if (!ready) {
    return (
      <div className="rounded-2xl border border-dashed border-[#CFE1E8] bg-[#F8FCFD] px-4 py-4 text-center text-xs text-[#8096A0]">
        เลือกชั้นปี ปีการศึกษา และเทอม เพื่อดูกลุ่มเรียน
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#D7E7EE] bg-[#F7FBFD] px-4 py-5 text-sm text-[#698794]">
        <LoaderCircle className="animate-spin" size={17} />
        กำลังโหลดกลุ่มเรียน...
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-xs text-red-600">
        {error}
      </p>
    );
  }

  if (!subjects.length) {
    return (
      <p className="rounded-2xl border border-[#F0D7A8] bg-[#FFF9EC] px-4 py-3 text-center text-xs text-[#9A742E]">
        ยังไม่มีรายวิชาในหลักสูตรสำหรับชั้นปีและเทอมนี้
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[#D7E7EE] bg-[#F7FBFD] p-3">
      <div>
        <p className="text-sm font-medium text-[#5F7F8E]">เลือกกลุ่มเรียน</p>
        <p className="mt-0.5 text-[11px] text-[#8A9FA8]">
          เลือกหนึ่งกลุ่มต่อหนึ่งวิชา เพื่อเรียนกลุ่มเดียวกับเพื่อน
        </p>
      </div>

      {subjects.map((subject) => (
        <fieldset
          key={subject.subject_id}
          className="rounded-2xl border border-[#DFEAEE] bg-white p-3"
        >
          <legend className="px-1 text-sm font-medium text-[#405D6A]">
            {subject.subject_id} · {subject.subject_name}
          </legend>
          {subject.sections.length === 0 ? (
            <p className="mt-2 rounded-xl bg-[#FFF5F2] px-3 py-2 text-xs text-[#B1624F]">
              ยังไม่มีกลุ่มเรียนที่เปิดให้ลงทะเบียน
            </p>
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {subject.sections.map((section) => {
                const selected =
                  selectedSectionIds[subject.subject_id] === section.section_id;
                const owner =
                  section.instructors.find(
                    (instructor) => instructor.instructor_role === "owner",
                  ) ?? section.instructors[0];
                const seats =
                  section.capacity === null
                    ? `${section.enrolled_count} คน · ไม่จำกัด`
                    : `${section.enrolled_count}/${section.capacity} คน`;
                return (
                  <button
                    key={section.section_id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={section.is_full}
                    onClick={() => onSelect(subject.subject_id, section.section_id)}
                    className={`rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${
                      selected
                        ? "border-[#74BDD7] bg-[#EAF7FB] shadow-[0_4px_12px_rgba(92,165,191,0.16)]"
                        : "border-[#D8E4E8] bg-white hover:border-[#9DCCDC] hover:bg-[#F7FCFE]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-[#3F6473]">
                        กลุ่ม {section.section_number}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] ${
                          section.is_full
                            ? "bg-[#FFF0EC] text-[#B25D49]"
                            : "bg-[#EDF8F1] text-[#4C8261]"
                        }`}
                      >
                        {section.is_full ? "เต็มแล้ว" : seats}
                      </span>
                    </div>

                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#6E858F]">
                      <UserRound size={13} />
                      {owner ? instructorName(owner) : "ยังไม่ระบุอาจารย์"}
                    </p>
                    {section.meetings.length === 0 ? (
                      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#9AA7AC]">
                        <Clock3 size={13} /> ยังไม่ระบุวันและเวลาเรียน
                      </p>
                    ) : (
                      <div className="mt-1.5 space-y-1 text-[11px] text-[#6E858F]">
                        {section.meetings.map((meeting) => (
                          <p
                            key={meeting.class_meeting_id}
                            className="flex flex-wrap items-center gap-x-2 gap-y-1"
                          >
                            <span className="inline-flex items-center gap-1">
                              <Clock3 size={12} />
                              {dayLabels[meeting.day_of_week] ?? meeting.day_of_week}{" "}
                              {meeting.start_time}–{meeting.end_time}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} />
                              {meeting.classroom || "ไม่ระบุห้อง"}
                            </span>
                          </p>
                        ))}
                      </div>
                    )}
                    {section.instructors.length > 1 && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-[#889AA2]">
                        <UsersRound size={12} /> ผู้สอนร่วม {section.instructors.length - 1} คน
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>
      ))}
    </div>
  );
}
