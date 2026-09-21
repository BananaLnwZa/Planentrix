import {
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  UsersRound,
} from "lucide-react";
import AdminLogoutButton from "@/components/Main/AdminLogoutButton";
import { requireInstructorSession } from "@/services/admin-session";

const instructorFeatures = [
  {
    title: "รายวิชา",
    description: "จัดเตรียมพื้นที่สำหรับดูรายวิชาที่รับผิดชอบ",
    icon: BookOpen,
  },
  {
    title: "ข้อสอบและงาน",
    description: "จัดเตรียมพื้นที่สำหรับติดตามข้อสอบและงานของรายวิชา",
    icon: ClipboardCheck,
  },
  {
    title: "นักศึกษา",
    description: "จัดเตรียมพื้นที่สำหรับดูข้อมูลนักศึกษาในรายวิชา",
    icon: UsersRound,
  },
] as const;

export default async function InstructorMainPage() {
  const instructor = await requireInstructorSession();
  const displayName =
    [instructor.first_name, instructor.last_name].filter(Boolean).join(" ") ||
    instructor.admin_name;

  return (
    <div className="min-h-svh bg-[linear-gradient(145deg,#f4fbfd_0%,#eef5fb_48%,#f8f4fc_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-5 rounded-[28px] border border-white/85 bg-white/80 p-6 shadow-[0_24px_70px_rgba(74,111,132,0.14)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#d9eff8] text-[#39758c] shadow-inner">
            <GraduationCap aria-hidden="true" size={30} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6993a3]">
              Instructor
            </p>
            <h1 className="mt-1 text-2xl text-[#2f4650] sm:text-3xl">
              ยินดีต้อนรับ {displayName}
            </h1>
          </div>
        </div>

        <div className="w-full sm:w-44">
          <AdminLogoutButton />
        </div>
      </header>

      <main className="mx-auto mt-7 w-full max-w-6xl">
        <section className="rounded-[28px] border border-white/85 bg-white/72 p-6 shadow-[0_18px_55px_rgba(74,111,132,0.1)] backdrop-blur-xl sm:p-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-[#4f879c]">
              Instructor Dashboard
            </p>
            <h2 className="mt-2 text-2xl text-[#304b56]">
              พื้นที่ทำงานสำหรับอาจารย์
            </h2>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {instructorFeatures.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-2xl border border-[#dcebf0] bg-white/80 p-5 shadow-sm"
              >
                <Icon
                  aria-hidden="true"
                  className="text-[#5794aa]"
                  size={24}
                  strokeWidth={1.8}
                />
                <h3 className="mt-4 text-lg text-[#38535e]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#7a8b92]">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
