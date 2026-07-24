import MainNotebookRing from "./MainNotebookRing";

export default function MainNotebook({
  children,
  tabs,
}: {
  children?: React.ReactNode;
  tabs?: React.ReactNode;
}) {
  return (
    <div
      className="
        relative
        min-h-[620px]
        w-full
        max-w-[1100px]
        overflow-visible
        rounded-[28px]
        border
        border-[#E1B6C5]
        bg-[#F3CCD8]
        p-4
        shadow-2xl
        sm:p-5
        md:aspect-[1.35/1]
        md:min-h-0
        md:w-[calc(100%-112px)]
        md:rounded-[36px]
        md:p-6
      "
    >
      {/* Pink back cover */}
      <div
        aria-hidden="true"
        className="
          absolute
          inset-0
          rounded-[28px]
          bg-gradient-to-br
          from-[#F8DDE5]
          via-[#F3CCD8]
          to-[#EABCCA]
          md:rounded-[36px]
        "
      />

      {/* Gold spine */}
      <div
        aria-hidden="true"
        className="
          absolute
          bottom-3
          left-1/2
          top-3
          z-10
          hidden
          w-[70px]
          -translate-x-1/2
          rounded-[20px]
          border
          border-[#C89B3C]
          bg-gradient-to-b
          from-[#E5BE3D]
          via-[#F3D982]
          to-[#B98527]
          shadow-[0_4px_10px_rgba(83,57,15,0.42),inset_0_6px_10px_rgba(255,245,185,0.38)]
          md:block
        "
      />

      {/* Single paper on small screens */}
      <div
        aria-hidden="true"
        className="
          absolute
          bottom-4
          left-4
          right-4
          top-4
          z-10
          rounded-[20px]
          border
          border-[#E8DDD3]
          bg-[#FFFCF7]
          shadow-[0_8px_24px_rgba(106,78,66,0.14)]
          sm:bottom-5
          sm:left-5
          sm:right-5
          sm:top-5
          md:hidden
        "
      />

      {/* Left paper sits above the back cover and gold spine */}
      <div
        aria-hidden="true"
        className="
          absolute
          bottom-5
          left-5
          right-1/2
          top-5
          z-20
          mr-[6px]
          hidden
          rounded-l-[18px]
          rounded-r-sm
          border
          border-[#E8DDD3]
          bg-[#FFFCF7]
          shadow-[-3px_3px_8px_rgba(73,55,45,0.28),6px_0_10px_rgba(69,49,19,0.18)]
          md:block
        "
      />

      {/* Right paper sits above the back cover and gold spine */}
      <div
        aria-hidden="true"
        className="
          absolute
          bottom-5
          left-1/2
          right-5
          top-5
          z-20
          ml-[6px]
          hidden
          rounded-l-sm
          rounded-r-[18px]
          border
          border-[#E8DDD3]
          bg-[#FFFCF7]
          shadow-[3px_3px_8px_rgba(73,55,45,0.28),-6px_0_10px_rgba(69,49,19,0.18)]
          md:block
        "
      />

      <MainNotebookRing />

      {tabs}

      {children && (
        <div className="relative z-20 h-full w-full p-8 md:p-12">
          {children}
        </div>
      )}
    </div>
  );
}
