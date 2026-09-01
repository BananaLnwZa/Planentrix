import AdminNavbar from "@/components/Main/AdminNavbar";
import ExamHeader from "@/components/Exam/ExamHeader";
import ExamManagementClient from "@/components/Exam/ExamManagementClient";
import { requireAdminSession } from "@/services/admin-session";

export default async function ExamPage() {
  const admin = await requireAdminSession();
  const adminName = admin.admin_name;
  const adminId = String(admin.admin_id);
  return (
    <div className="min-h-svh bg-[#f5fafc] pb-12">
      <AdminNavbar adminName={adminName} adminId={adminId} activeHref="/Exam" />
      <main className="mx-auto w-full max-w-[1440px] px-4 pt-10 sm:px-6 lg:px-8">
        <ExamHeader />
        <ExamManagementClient />
      </main>
    </div>
  );
}
