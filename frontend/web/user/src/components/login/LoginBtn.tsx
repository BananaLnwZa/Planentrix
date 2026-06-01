interface LoginBtnProps {
  isLoading?: boolean;
}

export default function LoginBtn({ isLoading = false }: LoginBtnProps) {
  return (
    <button
      type="submit"
      disabled={isLoading}
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

        disabled:opacity-50
        disabled:cursor-not-allowed
        disabled:hover:scale-100
      "
    >
      {isLoading ? "Logging in..." : "Login"}
    </button>
  );
}