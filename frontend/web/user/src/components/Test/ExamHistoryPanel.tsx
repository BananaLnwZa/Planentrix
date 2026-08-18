import type { ExamHistoryItem } from "@/interfaces/exam.interface";

const scoreText = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

const weakestTopic = (item: ExamHistoryItem) =>
  [...item.weakTopics].sort((left, right) => left.percentage - right.percentage)[0];

export default function ExamHistoryPanel({
  history,
  selectedSubjectId,
  onSubjectChange,
}: {
  history: ExamHistoryItem[];
  selectedSubjectId: string | null;
  onSubjectChange: (subjectId: string) => void;
}) {
  const subjects = Array.from(
    new Map(history.map((item) => [item.subjectId || item.subjectName, item])).values()
  );
  const activeKey = selectedSubjectId ?? (subjects[0]?.subjectId || subjects[0]?.subjectName);
  const selectedSubject =
    subjects.find((subject) => (subject.subjectId || subject.subjectName) === activeKey) ??
    subjects[0];
  const orderedSubjects = [
    selectedSubject,
    ...subjects.filter(
      (subject) =>
        (subject.subjectId || subject.subjectName) !==
        (selectedSubject.subjectId || selectedSubject.subjectName)
    ),
  ];
  const items = history
    .filter((item) => (item.subjectId || item.subjectName) === activeKey)
    .sort((left, right) => (left.examDate?.getTime() ?? 0) - (right.examDate?.getTime() ?? 0));

  if (!subjects.length) {
    return (
      <section>
        <h2 className="text-[15px] font-semibold text-[#536C77]">
          ประวัติการทำข้อสอบ
        </h2>
        <p className="py-5 text-xs text-[#91A1A7]">ยังไม่มีประวัติการทำข้อสอบ</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-2.5 text-[15px] font-semibold text-[#536C77]">
        ประวัติการทำข้อสอบ
      </h2>
      <div className="relative z-40 -mb-px h-11 max-w-full overflow-x-auto bg-transparent">
        <div className="flex min-w-max items-end pr-2">
        {orderedSubjects.map((subject, index) => {
          const key = subject.subjectId || subject.subjectName;
          const active = key === activeKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSubjectChange(key)}
              style={{
                zIndex: active
                  ? orderedSubjects.length + 1
                  : orderedSubjects.length - index,
              }}
              className={`relative -ml-[52px] w-[104px] rounded-t-[9px] border border-b-0 px-2 py-1 text-center text-[10px] leading-[12px] shadow-[0_-2px_6px_rgba(69,117,143,0.08)] transition-all first:ml-0 ${active ? "h-[42px] border-[#68B1D6] bg-[#78C0E4] font-semibold text-white shadow-[0_-3px_9px_rgba(69,140,177,0.18)]" : "mt-1 h-[38px] border-[#BDD7E4] bg-[#DDEEF6] font-medium text-[#527184] hover:-translate-y-0.5 hover:bg-[#D1E9F4]"}`}
              title={subject.subjectName}
            >
              <span className="line-clamp-2">{subject.subjectName}</span>
            </button>
          );
        })}
        </div>
      </div>

      <div className="relative z-30 -mt-[2px] rounded-b-[20px] rounded-tr-[20px] border border-[#DCE8ED] bg-white p-2 shadow-[0_7px_18px_rgba(55,93,112,0.12)]">
        <p className="mb-2 text-xs text-[#6C6668]">{selectedSubject.subjectName}</p>
        <div className="overflow-hidden rounded-lg border border-[#BDAEB2] text-[11px] text-[#75696C]">
          <div className="grid grid-cols-[45px_68px_1fr] bg-[#FBC5D1] text-center">
            <span className="border-r border-[#BDAEB2] py-2.5">รอบ</span>
            <span className="border-r border-[#BDAEB2] py-2.5">คะแนน</span>
            <span className="py-2.5">เรื่องที่อ่อน</span>
          </div>
          {items.map((item, index) => (
            <div
              key={item.historyId}
              className="grid grid-cols-[45px_68px_1fr] border-t border-[#C8C0C2] bg-white"
            >
              <span className="border-r border-[#C8C0C2] py-2.5 text-center">{index + 1}</span>
              <span className="border-r border-[#C8C0C2] py-2.5 text-center">
                {scoreText(item.actualScore)}/{scoreText(item.maximumScore)}
              </span>
              <span className="truncate px-3 py-2.5" title={weakestTopic(item)?.topicName}>
                {weakestTopic(item)?.topicName ?? "—"}
              </span>
            </div>
          ))}
          <div className="h-5 bg-[#FBC5D1]" />
        </div>
      </div>
    </section>
  );
}
