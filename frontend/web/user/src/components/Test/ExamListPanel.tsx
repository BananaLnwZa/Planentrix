import {
  ChevronRight,
  CircleHelp,
  Clock3,
  LoaderCircle,
  Medal,
  NotebookTabs,
} from "lucide-react";
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
      <div className="flex min-h-28 items-center justify-center rounded-2xl border border-[#DCE7D2] bg-[#F5FAEF] px-5 text-center text-sm text-[#78906A]">
        ยังไม่มีแบบทดสอบที่ถึงรอบ Checkpoint
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {exams.map((exam) => (
        <button
          key={exam.examRepositoryId}
          type="button"
          onClick={() => onOpen(exam)}
          disabled={openingExamId !== null}
          className="flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-[#E4DCD0] bg-white px-3.5 py-3 text-left shadow-[0_2px_5px_rgba(107,101,87,0.18)] transition hover:-translate-y-0.5 hover:border-[#C9DBE2] hover:shadow-[0_5px_12px_rgba(82,107,118,0.15)] disabled:cursor-wait disabled:opacity-65"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DDF3C8] text-[#759B58]">
            <NotebookTabs className="h-[21px] w-[21px]" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold leading-5 text-[#405B69]">
              {exam.examName || exam.subjectName}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#71858E]">
              <ExamMeta icon={<CircleHelp />} text={`${exam.totalQuestion} ข้อ`} />
              <ExamMeta icon={<Clock3 />} text={`${exam.timeLimitMinutes} นาที`} />
              <ExamMeta icon={<Medal />} text={`${formatScore(exam.totalScore)} คะแนน`} />
            </div>
          </div>
          {openingExamId === exam.examRepositoryId ? (
            <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-[#7CA9BA]" />
          ) : (
            <ChevronRight className="h-5 w-5 shrink-0 text-[#91A9B3]" />
          )}
        </button>
      ))}
    </div>
  );
}

function ExamMeta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="[&>svg]:h-3 [&>svg]:w-3 text-[#94A7AE]">{icon}</span>
      {text}
    </span>
  );
}

const formatScore = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);
