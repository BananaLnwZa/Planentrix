import { Tags } from "lucide-react";

export default function SubjectTypeHeader() {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-medium text-[#4b91aa]">Subject classification</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#293d47] sm:text-4xl">
          จัดการประเภทวิชา
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6c7f88] sm:text-base">
          สร้างและดูแลหมวดหมู่สำหรับจัดกลุ่มรายวิชาในหลักสูตร
        </p>
      </div>

      <div className="flex max-w-md items-start gap-3 rounded-2xl border border-[#dcd8f0] bg-[#f7f5fd] px-4 py-3 text-sm text-[#6d6786]">
        <Tags className="mt-0.5 shrink-0 text-[#8174b8]" size={19} />
        <p>ประเภทที่มีรายวิชาใช้งานอยู่สามารถเปลี่ยนชื่อได้ แต่ต้องย้ายวิชาออกก่อนจึงจะลบได้</p>
      </div>
    </header>
  );
}
