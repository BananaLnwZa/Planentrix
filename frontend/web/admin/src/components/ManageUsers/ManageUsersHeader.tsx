import { ShieldAlert } from "lucide-react";

export default function ManageUsersHeader() {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-medium text-[#4b91aa]">Admin workspace</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#293d47] sm:text-4xl">
          จัดการผู้ใช้งาน
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6c7f88] sm:text-base">
          ตรวจสอบ แก้ไข และลบบัญชีผู้ใช้ โดยบัญชีที่ไม่ได้เข้าใช้งานเกิน 1 ปีจะถูกจัดไว้ด้านบน
        </p>
      </div>

      <div className="flex max-w-md items-start gap-3 rounded-2xl border border-[#f1d4c9] bg-[#fff8f4] px-4 py-3 text-sm text-[#815c50]">
        <ShieldAlert className="mt-0.5 shrink-0 text-[#dd8065]" size={19} />
        <p>โปรดตรวจสอบชื่อและรหัสผู้ใช้ก่อนลบ เพราะบัญชีและข้อมูลที่เกี่ยวข้องจะถูกลบถาวร</p>
      </div>
    </header>
  );
}
