import { ClipboardCheck } from "lucide-react";

export default function ExamHeader() {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-medium text-[#4b91aa]">Exam repository</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#293d47] sm:text-4xl">จัดการข้อสอบ</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6c7f88] sm:text-base">
          จัดการชุดข้อสอบ Part คำถาม และตัวเลือก โดยแบ่งตามชั้นปีและภาคการศึกษา
        </p>
      </div>
      <div className="flex max-w-md items-start gap-3 rounded-2xl border border-[#cfe8f0] bg-[#f2fbfe] px-4 py-3 text-sm text-[#547783]">
        <ClipboardCheck className="mt-0.5 shrink-0 text-[#4e98b1]" size={19} />
        <p>จำนวนข้อและคะแนนรวมจะคำนวณใหม่จากคำถามจริงโดยอัตโนมัติ</p>
      </div>
    </header>
  );
}
