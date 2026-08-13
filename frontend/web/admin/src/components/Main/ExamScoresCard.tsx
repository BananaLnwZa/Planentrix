import { ChartNoAxesColumnIncreasing } from "lucide-react";
import DashboardCard from "./DashboardCard";

interface ExamScore {
  exam: string;
  average: number;
  highest: number;
  lowest: number;
  userCount?: number;
}

interface ExamScoresCardProps {
  scores: readonly ExamScore[];
  emptyMessage?: string;
}

const scoreSeries = [
  { key: "average", label: "เฉลี่ย", color: "bg-[#78bdd6]" },
  { key: "highest", label: "สูงสุด", color: "bg-[#67b797]" },
  { key: "lowest", label: "ต่ำสุด", color: "bg-[#e8a28e]" },
] as const;

export default function ExamScoresCard({
  scores,
  emptyMessage = "ยังไม่มีผลการทำข้อสอบสำหรับคำนวณคะแนน",
}: ExamScoresCardProps) {
  return (
    <DashboardCard
      title="คะแนนแยกตามข้อสอบ"
      subtitle="คะแนนเฉลี่ย สูงสุด และต่ำสุด คำนวณเป็นเปอร์เซ็นต์"
      icon={ChartNoAxesColumnIncreasing}
    >
      <div className="mb-5 flex flex-wrap gap-4">
        {scoreSeries.map((series) => (
          <span
            key={series.key}
            className="flex items-center gap-2 text-xs text-[#6d7d84]"
          >
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${series.color}`}
            />
            {series.label}
          </span>
        ))}
      </div>

      <div className="max-h-[420px] space-y-5 overflow-y-auto pr-1">
        {scores.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#d9e5e9] bg-[#f9fcfd] px-4 py-10 text-center text-sm text-[#87979e]">
            {emptyMessage}
          </div>
        )}
        {scores.map((score) => (
          <div key={score.exam}>
            <div className="mb-2 flex items-center justify-between">
              <span className="min-w-0 pr-3 text-xs font-medium text-[#455860]">
                <span className="block truncate">{score.exam}</span>
                {score.userCount !== undefined && (
                  <span className="mt-0.5 block text-[10px] font-normal text-[#94a2a8]">
                    ผู้เข้าสอบ {score.userCount.toLocaleString("th-TH")} คน
                  </span>
                )}
              </span>
              <span className="text-[11px] text-[#8a979c]">สเกล 100%</span>
            </div>
            <div className="space-y-1.5">
              {scoreSeries.map((series) => (
                <div key={series.key} className="flex items-center gap-2">
                  <span className="w-10 text-[10px] text-[#8a979c]">
                    {series.label}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#edf3f5]">
                    <div
                      className={`h-full rounded-full ${series.color}`}
                      style={{
                        width: `${Math.min(100, Math.max(0, score[series.key]))}%`,
                      }}
                    />
                  </div>
                  <span className="w-11 text-right text-[11px] font-medium text-[#44575f]">
                    {score[series.key].toLocaleString("th-TH", {
                      maximumFractionDigits: 1,
                    })}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
