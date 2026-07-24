interface AdminLoginButtonProps {
  isLoading: boolean;
}

export default function AdminLoginButton({
  isLoading,
}: AdminLoginButtonProps) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="flex h-11 w-full items-center justify-center rounded-full border border-[#86bbcf] bg-[#9ccfe0] px-6 text-sm font-medium tracking-wide text-[#244754] shadow-[0_8px_20px_rgba(91,155,178,0.2)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#88c3d8] hover:shadow-[0_12px_25px_rgba(91,155,178,0.28)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#bfe4ef] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
    >
      {isLoading ? "Logging in..." : "Log in"}
    </button>
  );
}
