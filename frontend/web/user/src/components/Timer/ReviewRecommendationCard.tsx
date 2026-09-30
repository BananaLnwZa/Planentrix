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
    <section className="shrink-0 rounded-[18px] border border-[#D9E7EC] bg-gradient-to-br from-white to-[#F2FAFD] px-4 py-3 shadow-[0_4px_10px_rgba(78,68,61,0.12)]">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E5F4FA] text-[#6AA4BA]">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[9px] font-semibold tracking-[0.16em] text-[#A77B8A] uppercase">Recommended review</p>
          <h2 className="text-sm font-semibold leading-tight text-[#4E6570]">วิชาที่แนะนำให้ทบทวน</h2>
        </div>
      </div>

      {items.length ? (
        <ul className="space-y-1.5">
          {items.slice(0, 4).map((item) => (
            <li key={`${item.subjectId}-${item.detail}`}>
              <button
                type="button"
                onClick={() => onSelectSubject(item.subjectId)}
                className="flex w-full items-center gap-2 rounded-xl border border-[#E5EEF1] bg-white/90 px-2.5 py-2 text-left transition hover:border-[#BBDCE8] hover:bg-white"
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
        <p className="rounded-xl bg-white/80 px-3 py-3 text-center text-[11px] leading-5 text-[#91A0A6]">
          ยังไม่มีวิชาที่ถูกแนะนำเป็นพิเศษ ลองทำข้อสอบหรือยอมรับแผนทบทวนรายสัปดาห์ก่อนนะ
        </p>
      )}
    </section>
  );
}
