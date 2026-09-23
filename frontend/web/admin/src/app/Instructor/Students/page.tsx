import { UsersRound } from "lucide-react";

export default function InstructorStudentsPage() {
  return (
    <section className="rounded-[28px] border border-white/85 bg-white/80 p-6 shadow-[0_18px_55px_rgba(74,111,132,0.1)] backdrop-blur-xl sm:p-8">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[#e4f5fa] text-[#4f879c]">
        <UsersRound aria-hidden="true" size={25} strokeWidth={1.8} />
      </div>
      <p className="mt-5 text-sm font-medium text-[#4f879c]">Students</p>
      <h2 className="mt-1 text-2xl text-[#304b56]">นักศึกษาในรายวิชา</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#7a8b92]">
        พื้นที่นี้เตรียมไว้สำหรับแสดงรายชื่อนักศึกษา เมื่อเชื่อมข้อมูลจาก
        Backend แล้ว รายชื่อจะปรากฏในหน้านี้
      </p>
    </section>
  );
}
