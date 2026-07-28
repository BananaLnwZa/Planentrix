import { Award } from "lucide-react";
import DashboardCard from "./DashboardCard";

interface ExamPart {
  label: string;
  score: number;
}

interface ExamPartRankingCardProps {
  best: readonly ExamPart[];
  weakest: readonly ExamPart[];
}

function RankingList({
  title,
  items,
  tone,
}: {
  title: string;
  items: readonly ExamPart[];
  tone: "good" | "weak";
}) {
  return (
    <div>
      <p
        className={`mb-3 text-xs font-medium ${
          tone === "good" ? "text-[#37896e]" : "text-[#bd6654]"
        }`}
      >
        {title}
      </p>
      <ol className="space-y-2.5">
        {items.map((item, index) => (
          <li
            key={item.label}
            className="flex items-center gap-2 rounded-xl bg-[#f8fbfc] px-2.5 py-2"
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] ${
                tone === "good"
                  ? "bg-[#e5f5ef] text-[#38876e]"
                  : "bg-[#fff0eb] text-[#b96855]"
              }`}
            >
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-[#5d6d74]">
              {item.label}
            </span>
            <span className="text-xs font-medium text-[#33474f]">
              {item.score}%
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function ExamPartRankingCard({
  best,
  weakest,
}: ExamPartRankingCardProps) {
  return (
    <DashboardCard
      title="ลำดับ Part ข้อสอบ"
      subtitle="ส่วนที่ผู้ใช้มักทำได้ดีและควรปรับปรุง อย่างละ 5 ลำดับ"
      icon={Award}
    >
      <div className="grid gap-5">
        <RankingList title="ทำได้ดี" items={best} tone="good" />
        <RankingList title="ควรปรับปรุง" items={weakest} tone="weak" />
      </div>
    </DashboardCard>
  );
}
