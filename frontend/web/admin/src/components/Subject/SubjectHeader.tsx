import { BookOpenCheck, Shapes } from "lucide-react";
import Link from "next/link";

export default function SubjectHeader() {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-medium text-[#4b91aa]">Academic catalog</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#293d47] sm:text-4xl">
          จัดการวิชา
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6c7f88] sm:text-base">
          จัดวิชาเข้าหลักสูตรของแต่ละคณะและสาขา แยกตามชั้นปีและภาคการศึกษา
        </p>
      </div>

      <div className="flex max-w-md flex-col gap-3 rounded-2xl border border-[#cfe8f0] bg-[#f2fbfe] px-4 py-3 text-sm text-[#547783]">
        <div className="flex items-start gap-3">
          <BookOpenCheck className="mt-0.5 shrink-0 text-[#4e98b1]" size={19} />
          <p>ข้อมูลเชื่อมจากรายการวิชา ประเภทวิชา และโครงสร้างหลักสูตรในฐานข้อมูลโดยตรง</p>
        </div>
        <Link href="/SubjectType" className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-[#4b8296] shadow-sm transition hover:bg-[#e8f6fa]">
          <Shapes size={15} /> จัดการประเภทวิชา
        </Link>
      </div>
    </header>
  );
}
