import { Flag, Gauge } from "lucide-react";
import type { StudyDashboard } from "@/interfaces/time.interface";
import { formatDuration } from "./timer.utils";

const milestones = [0, 25, 50, 75, 100];

export default function StudyStatistics({
  dashboard,
  currentWeekMinutes,
  targetMinutes,
}: {
  dashboard: StudyDashboard;
  currentWeekMinutes: number;
  targetMinutes: number;
}) {
  const progress = targetMinutes > 0
    ? Math.min(100, Math.round((currentWeekMinutes / targetMinutes) * 100))
    : 0;

  return (
    <section className="relative flex min-h-[205px] flex-1 flex-col overflow-hidden rounded-[18px] border border-[#D8E2E7] bg-white px-4 pb-4 pt-3 shadow-[0_4px_10px_rgba(78,68,61,0.16)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#EEE4DF] pb-2">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-[#A77B8A] uppercase">Weekly progress</p>
          <h2 className="font-sans text-lg font-semibold leading-tight text-[#4E4350]">Progress / สัปดาห์</h2>
        </div>
        <div className="rounded-full bg-[#EAF6FC] p-2 text-[#79B6D8]"><Gauge size={18} /></div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] text-[#8C9BA1]">เวลาทบทวนสัปดาห์นี้</p>
          <p className="mt-0.5 text-xl font-semibold leading-none text-[#568BA9]">{formatDuration(currentWeekMinutes, true)}</p>
        </div>
        {targetMinutes > 0 ? (
          <p className="text-right text-[10px] text-[#8C9BA1]">
            เป้าหมาย {formatDuration(targetMinutes, true)}
            <strong className="mt-0.5 block text-lg leading-none text-[#B66D85]">{progress}%</strong>
          </p>
        ) : (
          <p className="max-w-[145px] text-right text-[10px] leading-4 text-[#9AA7AC]">ยอมรับแผนทบทวนรายสัปดาห์เพื่อกำหนดเป้าหมาย</p>
        )}
      </div>

      <div className="mt-7 px-2">
        <div className="relative h-12">
          <div className="absolute left-0 right-0 top-[17px] h-[5px] rounded-full bg-[#E8E9E9]" />
          <div className="absolute left-0 top-[17px] h-[5px] rounded-full bg-[#E4869F] transition-[width] duration-700" style={{ width: `${progress}%` }} />
          {milestones.map((milestone) => {
            const reached = targetMinutes > 0 && progress >= milestone;
            return (
              <div key={milestone} className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${milestone}%` }}>
                {milestone === 100 ? (
                  <span className={`mb-1 inline-flex items-center gap-0.5 text-[10px] font-semibold ${reached ? "text-[#A34D68]" : "text-[#A8B0B4]"}`}>
                    <Flag className="h-3 w-3" fill="currentColor" />100%
                  </span>
                ) : (
                  <span className={`mb-1 text-[9px] font-medium ${reached ? "text-[#B66D85]" : "text-[#A8B0B4]"}`}>{milestone === 0 ? "เริ่ม" : `${milestone}%`}</span>
                )}
                <span className={`h-[16px] w-[16px] rounded-full border-[3px] shadow-sm transition-colors ${reached ? "border-[#315F9B] bg-[#315F9B]" : "border-[#B8C5CB] bg-white"}`} />
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-auto pt-2 text-center text-[10px] text-[#A2AEB2]">
        {targetMinutes > 0
          ? progress >= 100 ? "ถึงเป้าหมายทบทวนประจำสัปดาห์แล้ว เยี่ยมมาก!" : "ความคืบหน้าเทียบกับเป้าหมายทบทวนที่ยอมรับไว้"
          : `สัปดาห์นี้สะสมแล้ว ${formatDuration(dashboard.summary.current_week_minutes, true)}`}
      </p>
    </section>
  );
}
