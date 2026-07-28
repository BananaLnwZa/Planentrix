import { BookOpenText, Clock3 } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminNavbar from "@/components/Main/AdminNavbar";
import DashboardHeader from "@/components/Main/DashboardHeader";
import ExamPartRankingCard from "@/components/Main/ExamPartRankingCard";
import ExamScoresCard from "@/components/Main/ExamScoresCard";
import MetricCard from "@/components/Main/MetricCard";
import PopularConstraintsCard from "@/components/Main/PopularConstraintsCard";
import ReviewMethodsCard from "@/components/Main/ReviewMethodsCard";
import TaskCompletionCard from "@/components/Main/TaskCompletionCard";
import UserAccountsCard from "@/components/Main/UserAccountsCard";
import {
  bestExamParts,
  examScores,
  popularConstraints,
  reviewMethods,
  reviewTimeTrend,
  taskStatusDistribution,
  userYearDistribution,
  weakestExamParts,
  weeklyStudyTrend,
} from "@/data/dashboard.data";

export default async function AdminMainPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("adminAccessToken");

  if (!accessToken?.value) {
    redirect("/LogIn");
  }

  const adminName = cookieStore.get("adminName")?.value || "Admin";
  const adminId = cookieStore.get("adminId")?.value;

  return (
    <div className="min-h-svh bg-[#f5fafc] pb-12">
      <AdminNavbar adminName={adminName} adminId={adminId} />

      <main className="mx-auto w-full max-w-[1440px] px-4 pt-10 sm:px-6 lg:px-8">
        <DashboardHeader />

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="ค่าเฉลี่ยเวลาที่ใช้ต่อสัปดาห์ ในเทอมปัจจุบัน"
            value="14.8"
            unit="ชม./สัปดาห์"
            description="คำนวณจากกิจกรรมการเรียนและการทำงานของผู้ใช้ทั้งหมด"
            trendLabel="+12% จากสัปดาห์แรก"
            trend={weeklyStudyTrend}
            icon={Clock3}
            accent="blue"
          />
          <MetricCard
            title="ค่าเฉลี่ยเวลาที่ผู้ใช้ทบทวนทั้งหมด"
            value="6.4"
            unit="ชม./สัปดาห์"
            description="คิดเป็น 43% ของเวลาเรียนเฉลี่ยต่อสัปดาห์"
            trendLabel="+8% จากเดือนก่อน"
            trend={reviewTimeTrend}
            icon={BookOpenText}
            accent="coral"
          />
          <PopularConstraintsCard items={popularConstraints} />
          <ExamPartRankingCard
            best={bestExamParts}
            weakest={weakestExamParts}
          />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <UserAccountsCard distribution={userYearDistribution} />
          <TaskCompletionCard distribution={taskStatusDistribution} />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <ExamScoresCard scores={examScores} />
          <ReviewMethodsCard methods={reviewMethods} />
        </div>

        <p className="mt-7 text-center text-xs text-[#8a989e]">
          ข้อมูลตัวอย่างสำหรับออกแบบ Dashboard — พร้อมเชื่อมต่อ Analytics API
          ในขั้นถัดไป
        </p>
      </main>
    </div>
  );
}
