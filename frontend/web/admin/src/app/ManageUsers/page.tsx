import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminNavbar from "@/components/Main/AdminNavbar";
import ManageUsersClient from "@/components/ManageUsers/ManageUsersClient";
import ManageUsersHeader from "@/components/ManageUsers/ManageUsersHeader";

export default async function ManageUsersPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("adminAccessToken");

  if (!accessToken?.value) {
    redirect("/LogIn");
  }

  const adminName = cookieStore.get("adminName")?.value || "Admin";
  const adminId = cookieStore.get("adminId")?.value;

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
