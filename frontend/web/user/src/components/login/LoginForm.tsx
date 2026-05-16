import Link from "next/link";



export default function LoginForm() {
  return (
    <div className="w-[450px] max-w-md h-[450px] rounded-2xl bg-white/70 p-10 shadow-md backdrop-blur-sm">
      <h2 className="mb-8 text-center text-4xl font-medium text-black">
        LogIn
      </h2>

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm text-gray-700">
            username
          </label>
          <input
            type="text"
            placeholder="Enter username"
            className="w-full rounded-full border border-gray-300 px-5 py-3 outline-none text-gray-500 text-[12px]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-gray-700">
            password
          </label>
          <input
            type="password"
            placeholder="Enter password"
            className="w-full rounded-full border border-gray-300 px-5 py-3 outline-none text-gray-500 text-[12px]"
          />
        </div>

        <div className="pt-4 text-center">
          <button className="rounded-full border border-gray-300 bg-white px-10 py-2 shadow-sm text-black ">
            Login
          </button>
        </div>
      </div>

      <p className="mt-10 text-center text-sm text-gray-600">
        Don&apos;t have an account? <span className="underline"></span>
          <Link href="/SingIn" className="underline">
           Sign in
          </Link>
      </p>
    </div>
  );
}