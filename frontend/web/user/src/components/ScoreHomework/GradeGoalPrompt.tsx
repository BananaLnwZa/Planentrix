export default function GradeGoalPrompt({
  onStart,
  subjectCount,
}: {
  onStart: () => void;
  subjectCount: number;
}) {
  return (
    <section className="flex h-full min-h-[500px] items-center justify-center p-3 text-center">
      <div className="w-full max-w-[360px] rounded-xl border border-[#AFCFDC] bg-[#F8FCFE] shadow-[0_5px_9px_rgba(75,93,102,0.18)]">
        <div className="flex flex-col items-center px-6 py-7">
          <h1 className="text-lg font-semibold text-[#4F6B78]">
            ตั้งเป้าหมายเกรดก่อนนะ
          </h1>
          <p className="mt-2 max-w-[290px] text-sm leading-6 text-[#607987]">
            เลือกเกรดที่อยากได้ให้ครบทั้ง {subjectCount} วิชา แล้วดู GPA
            ที่คาดหวังได้ทันที
          </p>
          <div className="mt-5 w-full max-w-[290px] rounded-xl border border-[#D7E8EF] bg-white px-4 py-3">
            <p className="text-xs leading-5 text-[#6A818E]">
              เมื่อตกลงบันทึกแล้ว จะไม่สามารถกลับมาแก้เป้าหมายได้
            </p>
          </div>
          <button
            type="button"
            onClick={onStart}
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full bg-[#68B8E4] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#55ACDD] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#58A1CB]"
          >
            ตั้งเป้าหมายเกรด
          </button>
        </div>
      </div>
    </section>
  );
}
