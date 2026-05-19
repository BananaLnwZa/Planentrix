import Link from "next/link";

export default function LoginBtn() {
  return (
    <Link href="/Main">
      <button
        className="
          rounded-full
          border
          border-gray-300

          bg-white

          px-6
          py-2

          sm:px-8
          md:px-10

          text-sm
          sm:text-base

          text-black

          shadow-sm

          transition-all
          duration-300

          hover:bg-[#9CC5F9]
          hover:text-white
          hover:shadow-lg
          hover:scale-105

          active:scale-95
        "
      >
        Login
      </button>
    </Link>
  );
}