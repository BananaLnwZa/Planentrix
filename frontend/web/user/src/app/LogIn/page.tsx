import Notebook from "@/components/common/Notebook";
import LogoSection from "@/components/common/LogoSection";
import LoginForm from "@/components/login/LoginForm";

export default function LoginPage() {
  return (
    <div
      className="
        min-h-screen
        bg-[url('/images/bg.png')]
        bg-cover
        bg-center
        flex
        items-center
        justify-center
        p-8
      "
    >
      <Notebook>
        <LogoSection />
        <LoginForm />
      </Notebook>
    </div>
  );
}