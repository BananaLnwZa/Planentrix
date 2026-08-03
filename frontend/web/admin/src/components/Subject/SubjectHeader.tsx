import { BookOpenCheck } from "lucide-react";

export default function SubjectHeader() {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-medium text-[#4b91aa]">Academic catalog</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#293d47] sm:text-4xl">
          จัดการวิชา
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6c7f88] sm:text-base">
          จัดหลักสูตรตามชั้นปีและภาคการศึกษา พร้อมกำหนดประเภทวิชา ผู้สอน และเวลาเรียน
        </p>
      </div>

      <div className="flex max-w-md items-start gap-3 rounded-2xl border border-[#cfe8f0] bg-[#f2fbfe] px-4 py-3 text-sm text-[#547783]">
        <BookOpenCheck className="mt-0.5 shrink-0 text-[#4e98b1]" size={19} />
        <p>ประเภทวิชาทั้งหมดในหน้านี้ดึงจากตาราง subject_types และใช้ร่วมกับข้อมูลวิชาในฐานข้อมูล</p>
      </div>
    </header>
  );
}
