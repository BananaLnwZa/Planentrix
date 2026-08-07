import { BarChart3, CalendarDays, Sparkles } from "lucide-react";
import type { StudyDashboard } from "@/interfaces/time.interface";
import { formatDuration } from "./timer.utils";

export default function StudyStatistics({
  dashboard,
}: {
  dashboard: StudyDashboard;
}) {
  const maximumMinutes = Math.max(
    60,
    ...dashboard.weeks.map((week) => week.total_minutes)
  );

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-[#d8e2e7] bg-white px-4 pb-3 pt-3 shadow-[0_4px_10px_rgba(78,68,61,0.16)]">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-[#eee4df] pb-2">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-[#a77b8a] uppercase">
            Study statistics
          </p>
          <h2 className="font-sans text-lg font-semibold leading-tight text-[#4e4350]">
            สถิติการทบทวน
          </h2>
        </div>
        <div className="rounded-full bg-[#eaf6fc] p-2 text-[#79b6d8]">
          <BarChart3 size={18} />
        </div>
      </div>

      <div className="mb-2 flex items-center gap-2 text-sm text-[#776e71]">
        <span>สัปดาห์นี้ :</span>
        <strong className="rounded-full border border-[#d9e5ea] bg-[#fafdff] px-2.5 py-0.5 text-sm font-semibold text-[#568ba9]">
          {formatDuration(dashboard.summary.current_week_minutes, true)}
        </strong>
      </div>

      <div className="flex min-h-[180px] flex-1 flex-col rounded-xl border border-[#e4e1df] bg-white px-3 pb-2 pt-3 shadow-[0_2px_6px_rgba(86,74,67,0.08)]">
        <p className="mb-2 text-center text-sm font-medium text-[#82777b]">
          ชั่วโมงทบทวนต่อสัปดาห์
        </p>
        <div
          className="flex min-h-[105px] flex-1 items-end gap-1 overflow-hidden border-b border-[#dcdfe1] pb-1"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to top, transparent 0, transparent 24px, #edf0f2 25px)",
          }}
        >
          {dashboard.weeks.map((week, index) => {
            const height = Math.max(
              4,
              Math.round((week.total_minutes / maximumMinutes) * 120)
            );
            const isCurrentWeek = index === dashboard.weeks.length - 1;
            return (
              <div
                key={week.week_number}
                className="group flex min-w-0 flex-1 flex-col items-center justify-end"
                title={`สัปดาห์ ${week.week_number}: ${formatDuration(week.total_minutes)}`}
              >
                <span className="mb-1 hidden rounded bg-white/95 px-1 text-[10px] text-[#7f7176] group-hover:block">
                  {Math.round(week.total_minutes / 60)}h
                </span>
                <div
                  style={{ height }}
                  className={`w-full max-w-6 rounded-t-[7px] transition-all ${
                    isCurrentWeek
                      ? "bg-[#8ccbe9]"
                      : "bg-[#b8def1]"
                  }`}
                />
                <span
                  className={`mt-1 text-[10px] ${
                    isCurrentWeek
                      ? "font-bold text-[#4c8bb0]"
                      : "text-[#a3979b]"
                  }`}
                >
                  {dashboard.weeks.length <= 12 || index % 2 === 0 || isCurrentWeek
                    ? `W${week.week_number}`
                    : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 space-y-1.5">
        <SummaryItem
          icon={<CalendarDays size={14} />}
          label="เฉลี่ย/สัปดาห์"
          value={formatDuration(dashboard.summary.average_weekly_minutes, true)}
        />
        <SummaryItem
          icon={<CalendarDays size={14} />}
          label="เฉลี่ย/เดือน"
          value={formatDuration(dashboard.summary.average_monthly_minutes, true)}
        />
        <SummaryItem
          icon={<Sparkles size={14} />}
          label="รวมเทอมนี้"
          value={formatDuration(dashboard.summary.total_term_minutes, true)}
        />
      </div>
    </section>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-[#e3eaee] bg-[#fbfdff] px-2.5 py-1.5 text-xs text-[#756b6f]">
      <div className="flex min-w-0 items-center gap-1 text-[#8ebbd2]">
        {icon}
        <span className="truncate font-medium">{label} :</span>
      </div>
      <p
        className="shrink-0 rounded-lg border border-[#d9e5ea] bg-white px-2 py-0.5 font-semibold text-[#56839b]"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
