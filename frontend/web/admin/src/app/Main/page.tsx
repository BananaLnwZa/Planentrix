import AdminNavbar from "@/components/Main/AdminNavbar";
import DashboardHeader from "@/components/Main/DashboardHeader";
import ExamPartRankingMetricCard from "@/components/Main/ExamPartRankingMetricCard";
import ExamScoresMetricCard from "@/components/Main/ExamScoresMetricCard";
import PopularConstraintsMetricCard from "@/components/Main/PopularConstraintsMetricCard";
import ReviewMethodsMetricCard from "@/components/Main/ReviewMethodsMetricCard";
import TaskCompletionMetricCard from "@/components/Main/TaskCompletionMetricCard";
import UserAccountsMetricCard from "@/components/Main/UserAccountsMetricCard";
import StudyMetricCards from "@/components/Main/StudyTimeMetricCard";
import { requireAdminSession } from "@/services/admin-session";

export default async function AdminMainPage() {
  const admin = await requireAdminSession();
  const adminName = admin.admin_name;
  const adminId = String(admin.admin_id);

  return (
    <div className="min-h-svh bg-[#f5fafc] pb-12">
      <AdminNavbar
        adminName={adminName}
        adminId={adminId}
        activeHref="/Main"
      />

      <main className="mx-auto w-full max-w-[1440px] px-4 pt-10 sm:px-6 lg:px-8">
        <DashboardHeader />

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StudyMetricCards />
          <PopularConstraintsMetricCard />
          <ExamPartRankingMetricCard />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <UserAccountsMetricCard />
          <TaskCompletionMetricCard />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <ExamScoresMetricCard />
          <ReviewMethodsMetricCard />
        </div>

        <p className="mt-7 text-center text-xs text-[#8a989e]">
          Dashboard นี้ใช้ข้อมูลจริงจากระบบทั้งหมดแล้ว
        </p>
      </main>
    </div>
  );
}
