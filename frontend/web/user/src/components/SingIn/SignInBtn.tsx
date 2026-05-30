type SignInButtonProps = {
  text?: string;
  onClick?: () => void;
  className?: string;
};

export default function SignInButton({
  text = "Sign In",
  onClick,
  className = "",
}: SignInButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        rounded-full
          border
          border-gray-300

          h-[40px]
          sm:h-[50px]
          md:h-[60px]   

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

        ${className}
      `}
    >
      {text}
    </button>
  );
}