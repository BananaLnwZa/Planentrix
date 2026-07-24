import { KeyRound, Server, ShieldCheck } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminLogoutButton from "@/components/Main/AdminLogoutButton";

export default async function AdminMainPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("adminAccessToken");

  if (!accessToken?.value) {
    redirect("/LogIn");
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#eefaff] bg-[url('/images/bg.png')] bg-cover bg-center px-5 py-10 sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.78),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.1),rgba(212,242,251,0.22))]"
      />

      <section className="relative z-10 w-full max-w-2xl rounded-[28px] border border-white/90 bg-white/84 px-6 py-8 shadow-[0_24px_70px_rgba(73,111,132,0.2)] backdrop-blur-xl sm:px-10 sm:py-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#b9dce8] bg-[#e7f7fc] text-[#4d91aa] shadow-sm">
          <ShieldCheck aria-hidden="true" size={34} strokeWidth={1.7} />
        </div>

        <header className="mt-5 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#79a8bc]">
            Planentrix admin
          </p>
          <h1 className="mt-2 text-3xl font-normal tracking-[-0.02em] text-[#2d3740] sm:text-4xl">
            Login connected successfully
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm font-light leading-6 text-[#697981] sm:text-base">
            The admin backend returned a valid access token and this protected
            page can read the authenticated session.
          </p>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#d7e8ee] bg-white/70 p-5">
            <div className="flex items-center gap-3 text-[#426e80]">
              <Server aria-hidden="true" size={21} strokeWidth={1.8} />
              <h2 className="text-sm font-medium">Backend connection</h2>
            </div>
            <p className="mt-3 text-sm text-[#6e7c83]">
              Admin authentication API responded successfully.
            </p>
          </div>

          <div className="rounded-2xl border border-[#d7e8ee] bg-white/70 p-5">
            <div className="flex items-center gap-3 text-[#426e80]">
              <KeyRound aria-hidden="true" size={21} strokeWidth={1.8} />
              <h2 className="text-sm font-medium">Session status</h2>
            </div>
            <p className="mt-3 text-sm text-[#6e7c83]">
              Admin access token is present and the route guard is active.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <AdminLogoutButton />
        </div>
      </section>
    </main>
  );
}
