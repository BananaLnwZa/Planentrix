import { LoaderCircle, Play } from "lucide-react";
import type { ExamSummary } from "@/interfaces/exam.interface";

export default function ExamListPanel({
  exams,
  openingExamId,
  onOpen,
}: {
  exams: ExamSummary[];
  openingExamId: number | null;
  onOpen: (exam: ExamSummary) => void;
}) {
  if (!exams.length) {
    return (
      <div className="flex min-h-28 items-center justify-center rounded-2xl border border-[#DCE7D2] bg-[#F5FAEF] px-5 text-center text-xs text-[#78906A]">
        ยังไม่มีแบบทดสอบที่ถึงรอบ Checkpoint
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {exams.map((exam) => (
        <article
          key={exam.examRepositoryId}
          className="flex min-h-[58px] items-center gap-3 rounded-lg border border-[#DDD8CE] bg-white px-4 py-2.5 shadow-[0_2px_3px_rgba(70,58,44,0.20)]"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[#405B69]">
              {exam.examName || exam.subjectName}
            </p>
            <p className="mt-1 truncate text-[10px] text-[#82949C]">
              {exam.subjectName} · {exam.totalQuestion} ข้อ · {exam.timeLimitMinutes} นาที
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpen(exam)}
            disabled={openingExamId !== null}
            className="inline-flex h-8 min-w-[58px] items-center justify-center gap-1 rounded-full border border-[#8FC5DC] bg-[#C7ECFC] px-3 text-[11px] text-[#628A9D] transition hover:bg-[#91D3EF] hover:text-white disabled:opacity-60"
          >
            {openingExamId === exam.examRepositoryId ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3 w-3 fill-current" />
            )}
            เริ่ม
          </button>
        </article>
      ))}
    </div>
  );
}
