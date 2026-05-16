export default function NotebookRing() {
  return (
    <div
      className="
        absolute
        left-[-30px]
        top-0
        h-full
        flex
        flex-col
        justify-between
        py-8
        z-20
      "
    >
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={index}
          className="relative w-[80px] h-[24px]"
        >
          {/* วงแหวนสีดำ (อยู่หลัง) */}
          <div
            className="
              absolute
              right-[8px]
              top-[21%]
              -translate-y-1/2
              w-[12px]
              h-[12px]
              rounded-full
              border-[5px]
              border-black/70
              bg-transparent
              shadow-md
              z-0
            "
          />

          {/* แท่งสีทอง (อยู่หน้า) */}
          <div
            className="
              absolute
              left-0
              top-0
              w-[70px]
              h-[10px]
              rounded-full
              bg-gradient-to-r
              from-[#FDE68A]
              via-[#FACC15]
              to-[#EAB308]
              shadow-md
              z-10
            "
          />
        </div>
      ))}
    </div>
  );
}