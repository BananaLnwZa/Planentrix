import AdminNavbar from "@/components/Main/AdminNavbar";
import TeachingManagementClient from "@/components/Teaching/TeachingManagementClient";
import { requireAdminSession } from "@/services/admin-session";

export default async function TeachingPage() {
  const admin = await requireAdminSession();

  return (
    <div className="min-h-svh bg-[#f5fafc] pb-12">
      <AdminNavbar
        adminName={admin.admin_name}
        adminId={String(admin.admin_id)}
        activeHref="/Teaching"
      />
      <main className="mx-auto w-full max-w-[1440px] px-4 pt-10 sm:px-6 lg:px-8">
        <TeachingManagementClient />
      </main>
    </div>
  );
}
