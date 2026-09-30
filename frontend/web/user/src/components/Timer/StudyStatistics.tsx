import { Flag, Gauge } from "lucide-react";
import type { StudyDashboard, StudySession } from "@/interfaces/time.interface";
import type { ReviewRecommendationItem } from "./ReviewRecommendationCard";
import { formatDuration } from "./timer.utils";

export default function StudyStatistics({
  dashboard,
  recommendations,
  activeSession,
  elapsedSeconds,
}: {
  dashboard: StudyDashboard;
  recommendations: ReviewRecommendationItem[];
  activeSession: StudySession | null;
  elapsedSeconds: number;
}) {
  const weekStart = dashboard.weeks.at(-1)?.week_start;
  const activeSessionIsThisWeek = Boolean(
    activeSession && weekStart && activeSession.start_time.slice(0, 10) >= weekStart
  );
  const weeklyMinutes = new Map(
    dashboard.weekly_subjects.map((subject) => [
      subject.subject_id,
      subject.total_minutes,
    ])
  );
  const groupedRecommendations = new Map<string, ReviewRecommendationItem>();

  for (const item of recommendations) {
    const existing = groupedRecommendations.get(item.subjectId);
    if (existing) {
      existing.minutes = (existing.minutes ?? 0) + (item.minutes ?? 0);
      if ((item.percentage ?? 100) < (existing.percentage ?? 100)) {
        existing.percentage = item.percentage;
        existing.detail = item.detail;
      }
    } else {
      groupedRecommendations.set(item.subjectId, { ...item });
    }
  }

  const progressItems = Array.from(groupedRecommendations.values());
  const currentWeekRecommendedMinutes = progressItems.reduce((sum, item) => {
    const completed = weeklyMinutes.get(item.subjectId) ?? 0;
    const liveMinutes =
      activeSessionIsThisWeek && activeSession?.subject_id === item.subjectId
        ? elapsedSeconds / 60
        : 0;
    return sum + completed + liveMinutes;
  }, 0);

  return (
    <section className="relative flex h-full min-h-[380px] flex-col overflow-hidden rounded-[22px] border border-[#D8E2E7] bg-gradient-to-br from-white via-[#F8FCFF] to-[#EEF7FB] p-4 shadow-[0_10px_24px_rgba(87,65,53,0.10)] sm:p-5 md:min-h-0">
      <div className="flex items-center justify-between gap-3 border-b border-[#EEE4DF] pb-2">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-[#A77B8A] uppercase">
            Weekly progress
          </p>
          <h2 className="font-sans text-lg font-semibold leading-tight text-[#4E4350]">
            Progress / สัปดาห์
          </h2>
        </div>
        <div className="rounded-full bg-[#EAF6FC] p-2 text-[#79B6D8]">
          <Gauge size={18} />
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] text-[#8C9BA1]">เวลาทบทวนสัปดาห์นี้</p>
          <p className="mt-0.5 text-lg font-semibold leading-none text-[#568BA9]">
            {formatDuration(currentWeekRecommendedMinutes, true)}
          </p>
        </div>
        {progressItems.length > 0 && (
          <span className="text-right text-[10px] text-[#8C9BA1]">
            {progressItems.length} วิชาที่แนะนำ
          </span>
        )}
      </div>

      {progressItems.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <Gauge className="mb-2 h-8 w-8 text-[#85BDDB]" aria-hidden="true" />
          <p className="text-sm font-semibold text-[#6D6065]">
            ยังไม่มีวิชาที่ระบบแนะนำ
          </p>
          <p className="mt-1 max-w-[240px] text-xs leading-5 text-[#A3979B]">
            ยอมรับแผนทบทวนรายสัปดาห์ หรือทำข้อสอบเพื่อรับคำแนะนำรายวิชา
          </p>
        </div>
      ) : (
        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {progressItems.map((item) => {
            const targetMinutes = item.minutes ?? 0;
            const actualMinutes =
              (weeklyMinutes.get(item.subjectId) ?? 0) +
              (activeSessionIsThisWeek &&
              activeSession?.subject_id === item.subjectId
                ? elapsedSeconds / 60
                : 0);
            const progress =
              targetMinutes > 0
                ? Math.min(100, Math.round((actualMinutes / targetMinutes) * 100))
                : 0;

            return (
              <article
                key={item.subjectId}
                className="rounded-xl border border-[#DCE8ED] bg-white/90 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[#4E6570]">
                      {item.subjectName}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-[#91A0A6]">
                      {item.detail}
                      {item.percentage !== undefined
                        ? ` · คะแนน ${item.percentage}%`
                        : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-right text-[10px] font-semibold text-[#668DA4]">
                    {targetMinutes > 0
                      ? `${formatDuration(actualMinutes, true)} / ${formatDuration(targetMinutes, true)}`
                      : formatDuration(actualMinutes, true)}
                  </span>
                </div>
                <div className="relative mt-2 h-5">
                  <div className="absolute left-0 right-0 top-[8px] h-1.5 rounded-full bg-[#E8E9E9]" />
                  <div
                    className="absolute left-0 top-[8px] h-1.5 rounded-full bg-[#E4869F] transition-[width] duration-700"
                    style={{ width: `${progress}%` }}
                  />
                  {[0, 25, 50, 75, 100].map((milestone) => {
                    const reached = targetMinutes > 0 && progress >= milestone;
                    return (
                      <span
                        key={milestone}
                        className={`absolute top-[3px] h-3 w-3 -translate-x-1/2 rounded-full border-2 shadow-sm ${
                          reached
                            ? "border-[#315F9B] bg-[#315F9B]"
                            : "border-[#B8C5CB] bg-white"
                        }`}
                        style={{ left: `${milestone}%` }}
                        aria-hidden="true"
                      />
                    );
                  })}
                  {targetMinutes > 0 && progress >= 100 && (
                    <Flag
                      className="absolute -top-1 right-0 h-3 w-3 text-[#A34D68]"
                      fill="currentColor"
                      aria-label="ถึงเป้าหมาย"
                    />
                  )}
                </div>
                <p className="text-right text-[9px] text-[#A2AEB2]">
                  {targetMinutes > 0
                    ? `${progress}% ของเป้าหมายรายสัปดาห์`
                    : "ยังไม่มีเป้าหมายเวลารายสัปดาห์"}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
