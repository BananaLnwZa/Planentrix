import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminNavbar from "@/components/Main/AdminNavbar";
import SubjectHeader from "@/components/Subject/SubjectHeader";
import SubjectManagementClient from "@/components/Subject/SubjectManagementClient";

export default async function SubjectPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("adminAccessToken");

  if (!accessToken?.value) {
    redirect("/LogIn");
  }

  const adminName = cookieStore.get("adminName")?.value || "Admin";
  const adminId = cookieStore.get("adminId")?.value;

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
