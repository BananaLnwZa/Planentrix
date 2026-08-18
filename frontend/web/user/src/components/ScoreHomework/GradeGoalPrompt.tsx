import { Crosshair, Sparkles } from "lucide-react";

export default function GradeGoalPrompt({
  onStart,
  subjectCount,
}: {
  onStart: () => void;
  subjectCount: number;
}) {
  return (
    <section className="flex h-full min-h-[430px] items-center justify-center px-2 py-6">
      <div className="relative w-full overflow-hidden rounded-[28px] border border-[#B8DDF6] bg-gradient-to-br from-white via-[#F2FAFF] to-[#E4F4FF] px-6 py-8 text-center shadow-[0_16px_40px_rgba(74,145,190,0.16)]">
        <Sparkles
          aria-hidden="true"
          className="absolute right-5 top-5 h-5 w-5 text-[#8BC7EC]"
        />
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#DFF3FF] ring-8 ring-white/70">
          <Crosshair aria-hidden="true" className="h-10 w-10 text-[#58AEE1]" />
        </div>
        <p className="mb-1 text-sm font-medium tracking-wide text-[#5594B9]">
          เริ่มต้นวางแผนเทอมนี้
        </p>
        <h1 className="text-lg font-semibold text-[#244B63]">
          ตั้งเป้าหมายเกรดก่อนนะ
        </h1>
        <p className="mx-auto mt-3 max-w-[330px] text-sm leading-6 text-[#68889A]">
          เลือกเกรดที่อยากได้ให้ครบทั้ง {subjectCount} วิชา แล้วดู GPA
          ที่คาดหวังได้ทันที
        </p>
        <div className="mx-auto my-6 flex max-w-[290px] items-center gap-3 rounded-2xl border border-[#CDE7F7] bg-white/80 px-4 py-3 text-left">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF7FF] text-sm font-semibold text-[#4CA6DC]">
            !
          </span>
          <p className="text-xs leading-5 text-[#668396]">
            เมื่อตกลงบันทึกแล้ว จะไม่สามารถกลับมาแก้เป้าหมายได้
          </p>
        </div>
        <button
          type="button"
          onClick={onStart}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#66B8E8] px-7 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(75,164,216,0.3)] transition hover:-translate-y-0.5 hover:bg-[#55ADE0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#58AEE1]"
        >
          ตั้งเป้าหมายเกรด
        </button>
      </div>
    </section>
  );
}
