import { BookOpenCheck, Clock3 } from "lucide-react";
import type { StudyDashboard, StudyTypeName } from "@/interfaces/time.interface";
import {
  formatDuration,
  formatThaiMonth,
  studyTypeColors,
  studyTypeLabels,
} from "./timer.utils";
import styles from "./study-history.module.css";

export default function StudyHistory({
  dashboard,
}: {
  dashboard: StudyDashboard;
}) {
  return (
    <section className="relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-[22px] border border-[#d8e8f0] bg-gradient-to-br from-white via-[#f8fcff] to-[#eef7fb] p-4 shadow-[0_10px_24px_rgba(87,65,53,0.10)] sm:p-5 md:min-h-0">
      <div className="flex items-center justify-between gap-3 border-b border-[#eee4df] pb-2">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-[#a77b8a] uppercase">
            Study history
          </p>
          <h2 className="font-sans text-lg font-semibold leading-tight text-[#4e4350]">
            ประวัติการทบทวน
          </h2>
        </div>
        <div className="rounded-full bg-[#f5edf1] p-2 text-[#b2788c]">
          <BookOpenCheck size={18} />
        </div>
      </div>

      {dashboard.history.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-14 text-center">
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
          className={`${styles.historyScroll} mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto pr-2`}
        >
          {dashboard.history.map((month) => {
            const maximumSubjectMinutes = Math.max(
              1,
              ...month.subjects.map((subject) => subject.total_minutes)
            );
            return (
              <article key={month.month_key}>
                <div className="mb-2 flex items-center justify-between rounded-xl bg-gradient-to-r from-[#e4f4fc] via-[#edf8fb] to-[#f5edf2] px-3 py-2">
                  <h3 className="text-sm font-bold text-[#4f7890]">
                    {formatThaiMonth(month.month_key)}
                  </h3>
                  <span className="text-[11px] font-semibold text-[#668da4]">
                    {formatDuration(month.total_minutes, true)} · {month.session_count}{" "}
                    ครั้ง
                  </span>
                </div>

                <div className="space-y-2.5 px-1">
                  {month.subjects.map((subject) => (
                    <div
                      key={subject.subject_id}
                      className="rounded-xl border border-[#f0e7e2] bg-[#fffdfb] p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#594f53]">
                            {subject.subject_name}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[#a09297]">
                            {subject.session_count} ครั้ง
                          </p>
                        </div>
                        <p className="shrink-0 text-xs font-bold text-[#6a8fa4]">
                          {formatDuration(subject.total_minutes, true)}
                        </p>
                      </div>

                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#efeae7]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#8fc8ea] to-[#b8dfef]"
                          style={{
                            width: `${Math.max(
                              4,
                              (subject.total_minutes / maximumSubjectMinutes) * 100
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(subject.methods).map(
                          ([method, minutes]) => (
                            <span
                              key={method}
                              className="inline-flex items-center gap-1 rounded-full bg-[#f8f4f2] px-2 py-1 text-[9px] text-[#756a6e]"
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{
                                  backgroundColor:
                                    studyTypeColors[method as StudyTypeName],
                                }}
                              />
                              {studyTypeLabels[method as StudyTypeName] ?? method} {" "}
                              {formatDuration(Number(minutes), true)}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
