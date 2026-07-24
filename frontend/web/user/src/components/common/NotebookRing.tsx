export default function NotebookRing() {
  return (
    <div
      className="
        absolute

        left-[-10px]
        sm:left-[-18px]
        md:left-[-30px]

        top-0
        h-full

        flex
        flex-col
        justify-between

        py-6
        sm:py-7
        md:py-8

        z-20
      "
    >
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={index}
          className="
            relative

            w-[45px]
            h-[16px]

            sm:w-[60px]
            sm:h-[20px]

            md:w-[80px]
            md:h-[24px]
          "
        >


          {/* แท่งสีทอง */}
          <div
            className="
              absolute
              left-0
              top-0

              w-[40px]
              h-[7px]

              sm:w-[55px]
              sm:h-[2px]

              md:w-[70px]
              md:h-[10px]

              rounded-full

              bg-gradient-to-r
              from-[#FDE68A]
              via-[#FACC15]
              to-[#EAB308]

              shadow-sm
              md:shadow-md

              z-5
            "
          />

                    {/* วงแหวนสีดำ */}
          <div
            className="
              absolute

              right-[4px]
              sm:right-[6px]
              md:right-[8px]

              top-[21%]
              -translate-y-1/2

              w-[8px]
              h-[8px]

              sm:w-[10px]
              sm:h-[10px]

              md:w-[12px]
              md:h-[12px]

              rounded-full

              border-[3px]
              sm:border-[4px]
              md:border-[5px]

              border-black/70
              bg-transparent

              shadow-sm
              md:shadow-md

              z-0
            "
          />

        </div>
      ))}
    </div>
  );
}