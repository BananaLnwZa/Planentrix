import AdminBrand from "@/components/LogIn/AdminBrand";
import AdminLoginForm from "@/components/LogIn/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#eefaff] bg-[url('/images/bg.png')] bg-cover bg-center px-5 py-8 sm:px-8 sm:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.72),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(212,242,251,0.2))]"
      />

      <section
        aria-labelledby="admin-login-title"
        className="relative z-10 flex w-full max-w-[430px] flex-col items-center"
      >
        <AdminBrand />
        <AdminLoginForm />
      </section>
    </main>
  );
}
