import { Award } from "lucide-react";
import DashboardCard from "./DashboardCard";

interface ExamPart {
  label: string;
  score: number;
  userCount?: number;
}

interface ExamPartRankingCardProps {
  best: readonly ExamPart[];
  weakest: readonly ExamPart[];
  emptyMessage?: string;
}

function RankingList({
  title,
  items,
  tone,
  emptyMessage,
}: {
  title: string;
  items: readonly ExamPart[];
  tone: "good" | "weak";
  emptyMessage: string;
}) {
  return (
    <div className="min-w-0">
      <p
        className={`mb-3 text-xs font-medium ${
          tone === "good" ? "text-[#37896e]" : "text-[#bd6654]"
        }`}
      >
        {title}
      </p>
      <ol className="min-w-0 space-y-2.5">
        {items.length === 0 && (
          <li className="rounded-xl border border-dashed border-[#d9e5e9] bg-[#f9fcfd] px-3 py-4 text-center text-xs text-[#87979e]">
            {emptyMessage}
          </li>
        )}
        {items.map((item, index) => (
          <li
            key={item.label}
            className="flex min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-xl bg-[#f8fbfc] px-2.5 py-2"
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
            <span className="min-w-0 flex-1 overflow-hidden text-xs text-[#5d6d74]">
              <span className="block truncate" title={item.label}>
                {item.label}
              </span>
              {item.userCount !== undefined && (
                <span className="mt-0.5 block text-[10px] text-[#94a2a8]">
                  จากผู้ใช้ {item.userCount.toLocaleString("th-TH")} คน
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs font-medium text-[#33474f]">
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
  emptyMessage = "ยังไม่มีผลการทำข้อสอบสำหรับจัดอันดับ",
}: ExamPartRankingCardProps) {
  return (
    <DashboardCard
      title="ลำดับ Part ข้อสอบ"
      subtitle="ส่วนที่ผู้ใช้มักทำได้ดีและควรปรับปรุง อย่างละ 5 ลำดับ"
      icon={Award}
      className="min-w-0 overflow-hidden"
    >
      <div className="grid min-w-0 gap-5">
        <RankingList
          title="ทำได้ดี"
          items={best}
          tone="good"
          emptyMessage={emptyMessage}
        />
        <RankingList
          title="ควรปรับปรุง"
          items={weakest}
          tone="weak"
          emptyMessage={emptyMessage}
        />
      </div>
    </DashboardCard>
  );
}
