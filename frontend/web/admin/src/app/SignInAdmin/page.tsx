import Image from "next/image";
import AdminNavbar from "@/components/Main/AdminNavbar";
import AdminSignInForm from "@/components/SignInAdmin/AdminSignInForm";
import { requireAdminSession } from "@/services/admin-session";

export default async function AdminSignInPage() {
  const admin = await requireAdminSession();

  return (
    <div className="relative min-h-svh overflow-hidden bg-[#eefaff] bg-[url('/images/bg.png')] bg-cover bg-center pb-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.72),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(212,242,251,0.2))]"
      />

      <div className="relative z-20">
        <AdminNavbar
          adminName={admin.admin_name}
          adminId={String(admin.admin_id)}
          activeHref="/SignInAdmin"
        />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col items-center px-4 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        <Image
          src="/images/logo.png"
          alt="Planentrix"
          width={816}
          height={816}
          priority
          className="mb-5 h-auto w-[120px] drop-shadow-[0_10px_20px_rgba(72,81,99,0.12)] sm:mb-6 sm:w-[145px]"
        />
        <AdminSignInForm />
      </main>
    </div>
  );
}
