import { BookOpenCheck, ChevronRight, Sparkles } from "lucide-react";

export interface ReviewRecommendationItem {
  subjectId: string;
  subjectName: string;
  detail: string;
  minutes?: number;
  percentage?: number;
}

export default function ReviewRecommendationCard({
  items,
  onSelectSubject,
}: {
  items: ReviewRecommendationItem[];
  onSelectSubject: (subjectId: string) => void;
}) {
  return (
    <section className="relative shrink-0 rounded-[18px] border border-[#D8E2E7] bg-white px-4 pb-3 pt-3 shadow-[0_4px_10px_rgba(78,68,61,0.16)]">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-[#EEE4DF] pb-2">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-[#A77B8A] uppercase">Recommended review</p>
          <h2 className="font-sans text-lg font-semibold leading-tight text-[#4E4350]">วิชาที่แนะนำให้ทบทวน</h2>
        </div>
        <span className="rounded-full bg-[#EAF6FC] p-2 text-[#79B6D8]">
          <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      </div>

      {items.length ? (
        <ul className="space-y-1.5">
          {items.slice(0, 4).map((item) => (
            <li key={`${item.subjectId}-${item.detail}`}>
              <button
                type="button"
                onClick={() => onSelectSubject(item.subjectId)}
                className="flex w-full items-center gap-2 rounded-xl border border-[#E5EEF1] bg-[#FBFDFE] px-2.5 py-2 text-left transition hover:border-[#BBDCE8] hover:bg-white"
              >
                <BookOpenCheck className="h-4 w-4 shrink-0 text-[#85B5C6]" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-[#506872]">{item.subjectName}</span>
                  <span className="block truncate text-[10px] text-[#91A0A6]">
                    {item.minutes ? `เป้าหมาย ${item.minutes} นาที` : item.detail}
                    {item.percentage !== undefined ? ` · คะแนน ${item.percentage}%` : ""}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#A6BAC2]" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-[#F7FBFD] px-3 py-2.5 text-center text-[11px] leading-5 text-[#8C9BA1]">
          ยังไม่มีวิชาที่ถูกแนะนำเป็นพิเศษ ลองทำข้อสอบหรือยอมรับแผนทบทวนรายสัปดาห์ก่อนนะ
        </p>
      )}
    </section>
  );
}
