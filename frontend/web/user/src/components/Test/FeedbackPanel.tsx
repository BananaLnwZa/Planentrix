import { BookOpen, CalendarClock, Lightbulb, TrendingDown } from "lucide-react";
import type {
  ExamCheckpointInsight,
  WeakTopicInsight,
} from "@/interfaces/exam.interface";

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
    <section className={`rounded-xl p-3 ${color}`}>
      <h4 className="flex items-center gap-1.5 text-[11px] font-semibold text-[#536A74]">
        {icon}{title}
      </h4>
      <div className="mt-2 text-[10px] leading-4 text-[#62727A]">{children}</div>
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
    .filter((topic) => topic.percentage < 50)
    .sort((left, right) => left.percentage - right.percentage)
    .slice(0, 3);
  const sortedCheckpoints = [...checkpoints].sort(
    (left, right) => left.nextCheckpointAt.getTime() - right.nextCheckpointAt.getTime()
  );

  return (
    <article className="rounded-xl border border-[#DDD8CE] bg-white p-3.5 shadow-[0_2px_4px_rgba(70,58,44,0.20)]">
      <header className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E3F2F9] text-[#6292A8]">
          <BookOpen className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-xs font-semibold text-[#405B69]">{subjectName}</h3>
          <p className="text-[9px] text-[#91A0A7]">คำแนะนำหลังทำแบบทดสอบ</p>
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
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white text-[8px] text-[#B05E78]">{index + 1}</span>
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
            title="วิธีทบทวน"
            color="bg-[#E5F4FB]"
          >
            <ul className="space-y-1.5">
              {sortedTopics.map((topic) => (
                <li key={`study-${topic.examPartId}`}>
                  <strong className="font-semibold text-[#4F7D92]">{topic.topicName}: </strong>
                  {studyTypeLabel(topic.studyTypeName)}
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
                const weeks = weeksUntil(checkpoint.nextCheckpointAt);
                return (
                  <li key={`${checkpoint.examRepositoryId}-${checkpoint.nextCheckpointAt.toISOString()}`} className="flex justify-between gap-2">
                    <span className="truncate">{checkpoint.examName}</span>
                    <span className="shrink-0 font-semibold text-[#9A7527]">
                      {weeks <= 0 ? "ถึงรอบแล้ว" : `อีก ${weeks} สัปดาห์`}
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
