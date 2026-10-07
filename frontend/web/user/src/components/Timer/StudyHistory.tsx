import { useState } from "react";
import { Clock3 } from "lucide-react";
import type {
  MonthlyStudyHistory,
  MonthlyStudyWeek,
  StudyDashboard,
} from "@/interfaces/time.interface";
import { formatDuration, formatThaiMonth } from "./timer.utils";

const getDisplayedWeeks = (
  month: MonthlyStudyHistory,
  dashboardWeeks: StudyDashboard["weeks"]
): MonthlyStudyWeek[] => {
  const [year, monthNumber] = month.month_key.split("-").map(Number);
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === monthNumber;
  const daysToDisplay = isCurrentMonth
    ? today.getDate()
    : new Date(year, monthNumber, 0).getDate();
  const availableWeeks = new Map<number, MonthlyStudyWeek>();

  for (const week of month.weeks ?? []) {
    availableWeeks.set(week.week_number, week);
  }

  // รองรับ API รุ่นก่อนที่ยังไม่ได้ส่งสัปดาห์แยกตามเดือน
  if (availableWeeks.size === 0) {
    for (const week of dashboardWeeks) {
      if (!week.week_start.startsWith(month.month_key)) continue;
      const day = Number(week.week_start.slice(8, 10));
      const weekNumber = Math.floor((day - 1) / 7) + 1;
      availableWeeks.set(weekNumber, {
        week_number: weekNumber,
        total_minutes: week.total_minutes,
        session_count: 0,
      });
    }
  }

  const lastWeek = Math.max(
    1,
    Math.ceil(daysToDisplay / 7),
    ...availableWeeks.keys()
  );

  return Array.from({ length: lastWeek }, (_, index) =>
    availableWeeks.get(index + 1) ?? {
      week_number: index + 1,
      total_minutes: 0,
      session_count: 0,
    }
  );
};

const getChartScale = (weeks: MonthlyStudyWeek[]) => {
  const maximumHours = Math.max(
    0,
    ...weeks.map((week) => week.total_minutes / 60)
  );
  if (maximumHours === 0) {
    return { maximum: 1, ticks: [0, 0.25, 0.5, 0.75, 1] };
  }

  const roughStep = maximumHours / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const niceStep =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceStep * magnitude;
  const maximum = step * Math.ceil(maximumHours / step);
  const tickCount = Math.round(maximum / step);

  return {
    maximum,
    ticks: Array.from({ length: tickCount + 1 }, (_, index) => index * step),
  };
};

const formatAxisHours = (hours: number) =>
  Number.isInteger(hours) ? String(hours) : hours.toFixed(1);

export default function StudyHistory({
  dashboard,
}: {
  dashboard: StudyDashboard;
}) {
  const [selectedMonthKey, setSelectedMonthKey] = useState(
    dashboard.history[0]?.month_key ?? ""
  );
  const selectedMonth =
    dashboard.history.find((month) => month.month_key === selectedMonthKey) ??
    dashboard.history[0];
  const weeks = selectedMonth
    ? getDisplayedWeeks(selectedMonth, dashboard.weeks)
    : [];
  const chartScale = getChartScale(weeks);
  const totalSessions = dashboard.history.reduce(
    (sum, month) => sum + month.session_count,
    0
  );
  const averageWeeklyMinutes = selectedMonth
    ? selectedMonth.total_minutes / Math.max(1, weeks.length)
    : 0;

  return (
    <section className="relative shrink-0 rounded-[18px] border border-[#D8E2E7] bg-white px-4 pb-4 pt-3 shadow-[0_4px_10px_rgba(78,68,61,0.16)]">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-[#EEE4DF] pb-2">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-[#A77B8A] uppercase">
            Study history
          </p>
          <h2 className="font-sans text-lg font-semibold leading-tight text-[#4E4350]">
            ประวัติการทบทวน / เทอม
          </h2>
        </div>
        <span className="rounded-full bg-[#EAF6FC] p-2 text-[#79B6D8]">
          <Clock3 className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      </div>

      {dashboard.history.length === 0 || !selectedMonth ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center text-center">
          <p className="text-sm font-semibold text-[#6D6065]">
            ยังไม่มีประวัติการทบทวน
          </p>
          <p className="mt-1 max-w-[250px] text-xs leading-5 text-[#A3979B]">
            เมื่อจับเวลาเสร็จแล้ว ระบบจะแสดงชั่วโมงทบทวนแยกเป็นรายสัปดาห์
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {dashboard.history.map((month) => {
              const active = month.month_key === selectedMonth.month_key;
              return (
                <button
                  key={month.month_key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedMonthKey(month.month_key)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition ${
                    active
                      ? "border-[#9CCCE2] bg-[#DFF2FB] text-[#4F8199]"
                      : "border-[#E1E8EB] bg-[#FBFDFE] text-[#84949C] hover:border-[#BBDCE8]"
                  }`}
                >
                  {formatThaiMonth(month.month_key)}
                </button>
              );
            })}
          </div>

          {selectedMonth.total_minutes > 0 ? (
            <>
              <div className="mt-3 rounded-xl border border-[#E2E7EA] bg-[#FFFEFD] px-3 pb-3 pt-4 shadow-[0_2px_6px_rgba(78,68,61,0.08)]">
                <p className="text-center text-sm font-medium text-[#655D60]">
                  ชั่วโมงอ่านต่อสัปดาห์
                </p>

                <div className="mt-4 flex">
                  <div className="relative h-[172px] w-8 shrink-0">
                    {chartScale.ticks.map((tick) => (
                      <span
                        key={tick}
                        className="absolute right-2 -translate-y-1/2 text-[9px] text-[#92999D]"
                        style={{
                          bottom: `calc(${(tick / chartScale.maximum) * 100}% - 5px)`,
                        }}
                      >
                        {formatAxisHours(tick)}
                      </span>
                    ))}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="relative h-[172px]">
                      {chartScale.ticks.map((tick) => (
                        <span
                          key={tick}
                          className="absolute left-0 right-0 border-t border-[#D9DFE2]"
                          style={{
                            bottom: `${(tick / chartScale.maximum) * 100}%`,
                          }}
                          aria-hidden="true"
                        />
                      ))}
                      <div className="absolute inset-0 flex items-end gap-2 px-2">
                        {weeks.map((week) => {
                          const hours = week.total_minutes / 60;
                          const height =
                            (hours / chartScale.maximum) * 100;
                          return (
                            <div
                              key={week.week_number}
                              className="flex h-full min-w-0 flex-1 items-end justify-center"
                            >
                              <div
                                className={`w-full max-w-12 rounded-t-[14px] transition-[height] duration-500 ${
                                  week.total_minutes > 0
                                    ? "bg-[#B8DFF1]"
                                    : "bg-[#EDF2F4]"
                                }`}
                                style={{
                                  height:
                                    week.total_minutes > 0
                                      ? `${Math.max(3, height)}%`
                                      : "2px",
                                }}
                                title={`Week ${week.week_number}: ${formatDuration(week.total_minutes, true)}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-2 px-2 pt-2">
                      {weeks.map((week) => (
                        <span
                          key={week.week_number}
                          className="min-w-0 flex-1 text-center text-[9px] text-[#92999D]"
                        >
                          Week {week.week_number}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-[#F8FBFC] px-2 py-2">
                  <dt className="text-[9px] text-[#929DA2]">เฉลี่ยสัปดาห์ละ</dt>
                  <dd className="mt-1 text-[11px] font-semibold text-[#607E8C]">
                    {formatDuration(averageWeeklyMinutes, true)}
                  </dd>
                </div>
                <div className="rounded-xl bg-[#F8FBFC] px-2 py-2">
                  <dt className="text-[9px] text-[#929DA2]">เดือนที่เลือก</dt>
                  <dd className="mt-1 text-[11px] font-semibold text-[#607E8C]">
                    {formatDuration(selectedMonth.total_minutes, true)}
                  </dd>
                </div>
                <div className="rounded-xl bg-[#F8FBFC] px-2 py-2">
                  <dt className="text-[9px] text-[#929DA2]">รวมเทอมนี้</dt>
                  <dd className="mt-1 text-[11px] font-semibold text-[#607E8C]">
                    {formatDuration(dashboard.summary.total_term_minutes, true)}
                  </dd>
                </div>
              </dl>

              <p className="mt-2 text-center text-[9px] text-[#A1AAAE]">
                รวมทั้งหมด {totalSessions} ครั้งในเทอมนี้
              </p>
            </>
          ) : (
            <div className="flex min-h-[240px] items-center justify-center text-center">
              <p className="text-xs text-[#91A0A6]">
                ยังไม่มีประวัติการทบทวนในเดือนนี้
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
