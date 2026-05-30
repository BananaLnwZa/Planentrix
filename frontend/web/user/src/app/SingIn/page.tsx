import Notebook from "@/components/common/Notebook";
import LogoSection from "@/components/common/LogoSection";
import CreateAccForm from "@/components/SingIn/CreateAccForm";
import Constraint from "@/components/SingIn/constraintForm";
import SignInBtn from "@/components/SingIn/SignInBtn";

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
        <CreateAccForm />
        <Constraint />
        <SignInBtn />
      </Notebook>
    </div>
  );
}