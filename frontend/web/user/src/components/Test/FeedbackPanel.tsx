import { BookOpen, CalendarClock, Lightbulb, TrendingDown } from "lucide-react";
import type {
  ExamCheckpointInsight,
  WeakTopicInsight,
} from "@/interfaces/exam.interface";
import { formatDisplayDate } from "@/utils/dateTime";

const studyTypeLabel = (value: string) => {
  switch (value.trim().toLowerCase()) {
    case "reading": return "อ่านตำรา/เอกสาร";
    case "practice": return "ทำโจทย์/ฝึกปฏิบัติ";
    case "video": return "ดูวิดีโอ/lecture";
    case "review": return "ทบทวน/สรุปบทเรียน";
    default: return value || "ยังไม่มีวิธีทบทวนที่แนะนำ";
  }
};

const weeksUntil = (value: Date) => {
  const days = Math.ceil((value.getTime() - Date.now()) / 86_400_000);
  return days <= 0 ? 0 : Math.ceil(days / 7);
};

const checkpointWeeks = (checkpoint: ExamCheckpointInsight) => {
  if (checkpoint.nextCheckpointAt.getTime() <= Date.now()) return 0;
  return checkpoint.intervalWeeks > 0
    ? checkpoint.intervalWeeks
    : weeksUntil(checkpoint.nextCheckpointAt);
};

const formatReviewDuration = (minutes: number) => {
  const totalMinutes = Math.abs(Math.round(minutes));
  if (totalMinutes < 60) return `${totalMinutes} นาที`;
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return remainingMinutes > 0
    ? `${hours} ชม. ${remainingMinutes} นาที`
    : `${hours} ชม.`;
};

const reviewTimeText = (minutes: number) =>
  minutes > 0
    ? `เพิ่มเวลาทบทวน ${formatReviewDuration(minutes)}`
    : minutes < 0
      ? `ลดเวลาทบทวน ${formatReviewDuration(minutes)}`
      : "เวลาทบทวนปัจจุบันเหมาะสมแล้ว";

function FeedbackSection({
  icon,
  title,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-[13px] p-3 ${color}`}>
      <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[#536A74]">
        {icon}{title}
      </h4>
      <div className="mt-2 text-[11px] leading-[17px] text-[#62727A]">{children}</div>
    </section>
  );
}

export default function FeedbackPanel({
  subjectName,
  topics,
  checkpoints,
}: {
  subjectName: string;
  topics: WeakTopicInsight[];
  checkpoints: ExamCheckpointInsight[];
}) {
  const sortedTopics = [...topics]
    .sort((left, right) => left.percentage - right.percentage)
    .slice(0, 3);
  const sortedCheckpoints = [...checkpoints].sort(
    (left, right) => left.nextCheckpointAt.getTime() - right.nextCheckpointAt.getTime()
  );

  return (
    <article className="rounded-[19px] border border-[#DCE7EB] bg-white p-3.5 shadow-[0_3px_8px_rgba(0,0,0,0.09)]">
      <header className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E4F3FA] text-[#6091A7]">
          <BookOpen className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-[#405B69]">{subjectName}</h3>
          <p className="text-[11px] text-[#91A0A7]">คำแนะนำหลังทำแบบทดสอบ</p>
        </div>
      </header>

      <div className="space-y-2">
        <FeedbackSection
          icon={<TrendingDown className="h-3.5 w-3.5" />}
          title="เรื่องที่ควรเน้นทบทวน"
          color="bg-[#FFE7EB]"
        >
          {sortedTopics.length ? (
            <ol className="space-y-1.5">
              {sortedTopics.map((topic, index) => (
                <li key={topic.examPartId} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[9px] text-[#B05E78]">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{topic.topicName}</span>
                  <span className="font-semibold text-[#C25373]">{topic.percentage.toFixed(0)}%</span>
                </li>
              ))}
            </ol>
          ) : "ทำได้ดี ยังไม่มีเรื่องที่ต้องเน้นเป็นพิเศษ"}
        </FeedbackSection>

        {sortedTopics.length > 0 && (
          <FeedbackSection
            icon={<Lightbulb className="h-3.5 w-3.5" />}
            title="วิธีทบทวนที่แนะนำ"
            color="bg-[#E5F4FB]"
          >
            <ul className="space-y-1.5">
              {sortedTopics.map((topic) => (
                <li key={topic.examPartId} className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#72A9BE]" />
                  <span className="min-w-0">
                    <strong className="font-medium text-[#4D7487]">{topic.topicName}:</strong>{" "}
                    {studyTypeLabel(topic.studyTypeName)}
                  </span>
                </li>
              ))}
            </ul>
          </FeedbackSection>
        )}

        {sortedCheckpoints.length > 0 && (
          <FeedbackSection
            icon={<CalendarClock className="h-3.5 w-3.5" />}
            title="รอบ Checkpoint ถัดไป"
            color="bg-[#FFF0BF]"
          >
            <ul className="space-y-1.5">
              {sortedCheckpoints.map((checkpoint) => {
                const weeks = checkpointWeeks(checkpoint);
                return (
                  <li key={`${checkpoint.examRepositoryId}-${checkpoint.nextCheckpointAt.toISOString()}`} className="flex justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-[#665C3D]">{checkpoint.examName}</span>
                      <span className="mt-0.5 block text-[10px] text-[#907D54]">
                        {formatDisplayDate(checkpoint.nextCheckpointAt)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <strong className="block font-semibold text-[#9A7527]">
                        {weeks <= 0 ? "ถึงรอบแล้ว" : `อีก ${weeks} สัปดาห์`}
                      </strong>
                      <span className="mt-0.5 block text-[10px] text-[#66894E]">
                        {reviewTimeText(checkpoint.reviewMinutesDelta)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </FeedbackSection>
        )}
      </div>
    </article>
  );
}
