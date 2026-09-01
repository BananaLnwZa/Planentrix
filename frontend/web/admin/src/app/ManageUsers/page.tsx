import AdminNavbar from "@/components/Main/AdminNavbar";
import ManageUsersClient from "@/components/ManageUsers/ManageUsersClient";
import ManageUsersHeader from "@/components/ManageUsers/ManageUsersHeader";
import { requireAdminSession } from "@/services/admin-session";

export default async function ManageUsersPage() {
  const admin = await requireAdminSession();
  const adminName = admin.admin_name;
  const adminId = String(admin.admin_id);

  return (
    <div className="min-h-svh bg-[#f5fafc] pb-12">
      <AdminNavbar adminName={adminName} adminId={adminId} activeHref="/ManageUsers" />
      <main className="mx-auto w-full max-w-[1440px] px-4 pt-10 sm:px-6 lg:px-8">
        <ManageUsersHeader />
        <ManageUsersClient />
      </main>
    </div>
  );
}
