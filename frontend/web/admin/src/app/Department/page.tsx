import AcademicUnitHeader from "@/components/AcademicUnit/AcademicUnitHeader";
import DepartmentManagementClient from "@/components/AcademicUnit/DepartmentManagementClient";
import AdminNavbar from "@/components/Main/AdminNavbar";
import { requireAdminSession } from "@/services/admin-session";

export default async function DepartmentPage() {
  const admin = await requireAdminSession();

  return (
    <div className="min-h-svh bg-[#f5fafc] pb-12">
      <AdminNavbar
        adminName={admin.admin_name}
        adminId={String(admin.admin_id)}
        activeHref="/Department"
      />
      <main className="mx-auto w-full max-w-[1440px] px-4 pt-10 sm:px-6 lg:px-8">
        <AcademicUnitHeader
          eyebrow="University structure"
          title="จัดการสาขา"
          description="เพิ่มสาขาใหม่โดยระบุคณะที่สังกัด และตรวจสอบสาขาที่มีอยู่"
        />
        <DepartmentManagementClient />
      </main>
    </div>
  );
}
