import { ChartNoAxesColumnIncreasing } from "lucide-react";
import DashboardCard from "./DashboardCard";

interface ExamScore {
  exam: string;
  average: number;
  highest: number;
  lowest: number;
}

interface ExamScoresCardProps {
  scores: readonly ExamScore[];
}

const scoreSeries = [
  { key: "average", label: "เฉลี่ย", color: "bg-[#78bdd6]" },
  { key: "highest", label: "สูงสุด", color: "bg-[#67b797]" },
  { key: "lowest", label: "ต่ำสุด", color: "bg-[#e8a28e]" },
] as const;

export default function ExamScoresCard({ scores }: ExamScoresCardProps) {
  return (
    <DashboardCard
      title="คะแนนแยกตามข้อสอบ"
      subtitle="คะแนนเฉลี่ย สูงสุด และต่ำสุดของแต่ละประเภทข้อสอบ"
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

      <div className="space-y-5">
        {scores.map((score) => (
          <div key={score.exam}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-[#455860]">
                {score.exam}
              </span>
              <span className="text-[11px] text-[#8a979c]">เต็ม 100</span>
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
                      style={{ width: `${score[series.key]}%` }}
                    />
                  </div>
                  <span className="w-7 text-right text-[11px] font-medium text-[#44575f]">
                    {score[series.key]}
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
