import NotebookRing from "./NotebookRing";

export default function Notebook({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        relative
        w-full
        max-w-[900px]
        min-h-[600px]
        md:min-h-[700px]

        rounded-[20px]
        md:rounded-[30px]

        bg-[#F8DCE4]
        shadow-xl
        border
        border-[#e8c7d1]

        px-6
        py-10
        sm:px-8
        md:p-12

        flex
        flex-col
        items-center
        justify-center

        overflow-visible
      "
    >
      {/* ห่วงสมุด */}
      <div className="block">
        <NotebookRing />
      </div>

      {/* สันสมุด */}
      <div
        className="
          absolute
          left-0
          top-0
          h-full

          w-[50px]
          md:w-[70px]

          bg-[#FFF8F5]

          rounded-l-[20px]
          md:rounded-l-[30px]

          border-r
          border-dashed
          border-[#d8b9c3]
        "
      />

      {/* เนื้อหาที่ส่งเข้ามา */}
      <div
        className="
          z-10

          w-full

          pl-[40px]
          md:pl-[60px]

          flex
          flex-col
          items-center

          gap-6
          md:gap-10
        "
      >
        {children}
      </div>
    </div>
  );
}