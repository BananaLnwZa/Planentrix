import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";
import InstructorWorkspaceNav from "@/components/Instructor/InstructorWorkspaceNav";
import AdminLogoutButton from "@/components/Main/AdminLogoutButton";
import { requireInstructorSession } from "@/services/admin-session";

export default async function InstructorLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const instructor = await requireInstructorSession();
  const displayName =
    [instructor.first_name, instructor.last_name].filter(Boolean).join(" ") ||
    instructor.admin_name;

  return (
    <div className="min-h-svh bg-[linear-gradient(145deg,#f4fbfd_0%,#eef5fb_48%,#f8f4fc_100%)] px-4 py-4 sm:px-6 lg:px-8">
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-4 rounded-[28px] border border-white/85 bg-white/80 p-5 shadow-[0_20px_60px_rgba(74,111,132,0.13)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#d9eff8] text-[#39758c] shadow-inner">
            <GraduationCap aria-hidden="true" size={27} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6993a3]">
              Instructor
            </p>
            <h1 className="mt-1 text-xl text-[#2f4650] sm:text-2xl">
              ยินดีต้อนรับ {displayName}
            </h1>
          </div>
        </div>

        <div className="w-full sm:w-40">
          <AdminLogoutButton />
        </div>
      </header>

      <InstructorWorkspaceNav />

      <main className="mx-auto w-full max-w-6xl pb-10 pt-5">{children}</main>
    </div>
  );
}
