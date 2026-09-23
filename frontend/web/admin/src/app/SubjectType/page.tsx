import AdminNavbar from "@/components/Main/AdminNavbar";
import SubjectTypeHeader from "@/components/SubjectType/SubjectTypeHeader";
import SubjectTypeManagementClient from "@/components/SubjectType/SubjectTypeManagementClient";
import { requireAdminSession } from "@/services/admin-session";

export default async function SubjectTypePage() {
  const admin = await requireAdminSession();

  return (
    <div className="min-h-svh bg-[#f5fafc] pb-12">
      <AdminNavbar
        adminName={admin.admin_name}
        adminId={String(admin.admin_id)}
        activeHref="/SubjectType"
      />
      <main className="mx-auto w-full max-w-[1440px] px-4 pt-10 sm:px-6 lg:px-8">
        <SubjectTypeHeader />
        <SubjectTypeManagementClient />
      </main>
    </div>
  );
}
