import AdminNavbar from "@/components/Main/AdminNavbar";
import SubjectHeader from "@/components/Subject/SubjectHeader";
import SubjectManagementClient from "@/components/Subject/SubjectManagementClient";
import { requireAdminSession } from "@/services/admin-session";

export default async function SubjectPage() {
  const admin = await requireAdminSession();
  const adminName = admin.admin_name;
  const adminId = String(admin.admin_id);

  return (
    <div className="min-h-svh bg-[#f5fafc] pb-12">
      <AdminNavbar adminName={adminName} adminId={adminId} activeHref="/Subject" />
      <main className="mx-auto w-full max-w-[1440px] px-4 pt-10 sm:px-6 lg:px-8">
        <SubjectHeader />
        <SubjectManagementClient />
      </main>
    </div>
  );
}
