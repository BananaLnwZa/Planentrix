import { useState } from "react";
import { Clock3 } from "lucide-react";
import type { StudyDashboard } from "@/interfaces/time.interface";
import { formatDuration, formatThaiMonth } from "./timer.utils";
import styles from "./study-history.module.css";

export default function StudyHistory({
  dashboard,
}: {
  dashboard: StudyDashboard;
}) {
  const [selectedSubjects, setSelectedSubjects] = useState<Record<string, string>>({});

  return (
    <section className="relative flex min-h-[380px] max-h-[560px] flex-col overflow-hidden">
      {dashboard.history.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 rounded-full bg-[#edf7fc] p-4 text-[#85bddb]">
            <Clock3 size={28} />
          </div>
          <p className="text-sm font-semibold text-[#6d6065]">
            ยังไม่มีประวัติการทบทวน
          </p>
          <p className="mt-1 max-w-[240px] text-xs leading-5 text-[#a3979b]">
            เมื่อจับเวลาเสร็จแล้ว สรุปรายวิชาในแต่ละเดือนจะแสดงที่นี่
          </p>
        </div>
      ) : (
        <div
          className={`${styles.historyScroll} min-h-0 flex-1 space-y-3 overflow-y-auto pr-2`}
        >
          {dashboard.history.map((month, monthIndex) => {
            const maximumSubjectMinutes = Math.max(
              1,
              ...month.subjects.map((subject) => subject.total_minutes)
            );
            const activeSubjectId =
              selectedSubjects[month.month_key] ?? month.subjects[0]?.subject_id;
            const activeSubject = month.subjects.find(
              (subject) => subject.subject_id === activeSubjectId
            );
            const tabId = (subjectId: string) =>
              `history-${monthIndex}-${encodeURIComponent(subjectId)}`;

            return (
              <article key={month.month_key}>
                {month.subjects.length > 0 && (
                  <div className="relative z-40 -mb-px overflow-x-auto bg-transparent pt-2">
                    <div
                      role="tablist"
                      aria-label={`${formatThaiMonth(month.month_key)} รายวิชา`}
                      className="flex min-w-max items-end"
                    >
                      {month.subjects.map((subject, index) => {
                        const active = subject.subject_id === activeSubjectId;
                        return (
                          <button
                            key={subject.subject_id}
                            id={tabId(subject.subject_id)}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            aria-controls={`${tabId(subject.subject_id)}-panel`}
                            onClick={() =>
                              setSelectedSubjects((current) => ({
                                ...current,
                                [month.month_key]: subject.subject_id,
                              }))
                            }
                            style={{
                              zIndex: active ? month.subjects.length + 1 : month.subjects.length - index,
                            }}
                            className={`relative -ml-[52px] w-[104px] rounded-t-[9px] border border-b-0 px-2 py-1 text-center text-[10px] leading-[12px] shadow-[0_-2px_6px_rgba(69,117,143,0.08)] transition-all first:ml-0 ${
                              active
                                ? "h-[42px] border-[#68B1D6] bg-[#78C0E4] font-semibold text-white shadow-[0_-3px_9px_rgba(69,140,177,0.18)]"
                                : "mt-1 h-[38px] border-[#BDD7E4] bg-[#DDEEF6] font-medium text-[#527184] hover:-translate-y-0.5 hover:bg-[#D1E9F4]"
                            }`}
                          >
                            <span className="line-clamp-2">{subject.subject_name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="relative z-30 -mt-[2px] overflow-hidden rounded-b-[20px] rounded-tr-[20px] border border-[#DCE8ED] bg-white shadow-[0_7px_18px_rgba(55,93,112,0.12)]">
                  <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-[#E4F4FC] via-[#EDF8FB] to-[#F5EDF2] px-3 py-2">
                    <h3 className="text-sm font-bold text-[#4f7890]">
                      {formatThaiMonth(month.month_key)}
                    </h3>
                    <span className="text-right text-[10px] font-semibold text-[#668da4]">
                      {formatDuration(month.total_minutes, true)} · {month.session_count} ครั้ง
                    </span>
                  </div>

                  {activeSubject && (
                    <div
                      id={`${tabId(activeSubject.subject_id)}-panel`}
                      role="tabpanel"
                      aria-labelledby={tabId(activeSubject.subject_id)}
                      className="border-t border-[#DCE8ED] px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#594F53]">
                            ประวัติการทบทวน · {activeSubject.subject_name}
                          </p>
                          <p className="mt-1 text-[10px] text-[#A09297]">
                            ทบทวน {activeSubject.session_count} ครั้งในเดือนนี้
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-[#6A8FA4]">
                          {formatDuration(activeSubject.total_minutes, true)}
                        </p>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E7F0F4]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#86CBEF] to-[#58B2E3]"
                          style={{
                            width: `${Math.max(
                              4,
                              (activeSubject.total_minutes / maximumSubjectMinutes) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {month.subjects.length === 0 && (
                    <p className="border-t border-[#DCE8ED] px-3 py-5 text-center text-xs text-[#91A0A6]">
                      ยังไม่มีประวัติการทบทวนในเดือนนี้
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
