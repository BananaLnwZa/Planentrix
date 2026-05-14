import LogoSection from "./LogoSection";
import LoginForm from "./LoginForm";

export default function NotebookLayout() {
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
      {/* สมุดสีชมพู */}
      <div
        className="
          w-[900px]
          min-h-[700px]
          rounded-[30px]
          bg-[#F8DCE4]
          shadow-xl
          border border-[#e8c7d1]
          p-12
          flex
          flex-col
          items-center
          justify-center
          relative
        "
      >
        {/* เส้นสันสมุดด้านซ้าย */}
        <div
          className="
            absolute
            left-0
            top-0
            h-full
            w-[70px]
            bg-[#FFF8F5]
            rounded-l-[30px]
            border-r
            border-dashed
            border-[#d8b9c3]
          "
        />

        {/* เนื้อหาด้านใน */}
        <div className="z-10 flex flex-col items-center gap-10">
          <LogoSection />
          <LoginForm />
        </div>
      </div>
    </div>
  );
}