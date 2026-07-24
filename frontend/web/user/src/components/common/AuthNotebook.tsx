import NotebookRing from "./NotebookRing";

export default function AuthNotebook({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        relative
        flex
        min-h-[600px]
        w-full
        max-w-[900px]
        flex-col
        items-center
        justify-center
        overflow-visible
        rounded-[20px]
        border
        border-[#e8c7d1]
        bg-[#F8DCE4]
        px-6
        py-10
        shadow-xl
        sm:px-8
        md:min-h-[700px]
        md:rounded-[30px]
        md:p-12
      "
    >
      <NotebookRing />

      <div
        aria-hidden="true"
        className="
          absolute
          left-0
          top-0
          h-full
          w-[50px]
          rounded-l-[20px]
          border-r
          border-dashed
          border-[#d8b9c3]
          bg-[#FFF8F5]
          md:w-[70px]
          md:rounded-l-[30px]
        "
      />

      <div
        className="
          z-10
          flex
          w-full
          flex-col
          items-center
          gap-6
          pl-[40px]
          md:gap-10
          md:pl-[60px]
        "
      >
        {children}
      </div>
    </div>
  );
}
