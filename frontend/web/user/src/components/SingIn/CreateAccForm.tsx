import Link from "next/link";
import Image from "next/image";

export default function LoginForm() {
  return (
    <div
      className="
        w-full
        max-w-[450px]

        min-h-[420px]
        md:min-h-[450px]

        rounded-2xl

        bg-white/70

        p-6
        sm:p-8
        md:p-10

        shadow-md
        backdrop-blur-sm
      "
    >
      <h2
        className="
          mb-6
          md:mb-8

          text-center

          text-3xl
          sm:text-4xl

          font-medium
          text-black
        "
      >
        Create Account
      </h2>

      <div className="space-y-4 md:space-y-5">
        {/* Username */}
        <div>
          <label
            className="
              mb-2
              block

              text-xs
              sm:text-sm

              text-gray-700
            "
          >
            username
          </label>

          <input
            type="text"
            placeholder="Enter username"
            className="
              w-full

              rounded-full
              border
              border-gray-300

              px-4
              py-2.5

              sm:px-5
              sm:py-3

              outline-none

              text-[11px]
              sm:text-[12px]
              md:text-[14px]

              text-gray-500
            "
          />
        </div>

        {/* Password */}
        <div>
          <label
            className="
              mb-2
              block

              text-xs
              sm:text-sm

              text-gray-700
            "
          >
            password
          </label>

          <input
            type="password"
            placeholder="Enter password"
            className="
              w-full

              rounded-full
              border
              border-gray-300

              px-4
              py-2.5

              sm:px-5
              sm:py-3

              outline-none

              text-[11px]
              sm:text-[12px]
              md:text-[14px]

              text-gray-500
            "
          />
        </div>

        {/* Confirm Password */}
        <div>
          <label
            className="
              mb-2
              block

              text-xs
              sm:text-sm

              text-gray-700
            "
          >
            Confirm Password
          </label>

          <input
            type="password"
            placeholder="Confirm password"
            className="
              w-full

              rounded-full
              border
              border-gray-300

              px-4
              py-2.5

              sm:px-5
              sm:py-3

              outline-none

              text-[11px]
              sm:text-[12px]
              md:text-[14px]

              text-gray-500
            "
          />
        </div>

        {/* Birth Date */}
        <div>
          <label
            className="
              mb-2
              block

              text-xs
              sm:text-sm

              text-gray-700
            "
          >
            Birth Date
          </label>

          <input
            type="date"
            className="
              custom-date

              w-1/2
              md:w-1/2

              rounded-full
              border
              border-gray-300

              px-4
              py-2.5

              sm:px-5
              sm:py-3

              text-gray-400

              text-[12px]
              sm:text-[14px]

              outline-none
            "
          />
        </div>

        {/* Select Gender */}
        <div>
          <label
            className="
              mb-2
              block

              text-xs
              sm:text-sm

              text-gray-700
            "
          >
            Select Gender
          </label>

          {/* custom dropdown */}
        <div className="relative w-1/2">
        <select
            className="
            w-full
            appearance-none
            rounded-full
            border
            border-gray-300

            px-4
            pr-10
            py-2.5

            sm:px-5
            sm:py-3

            text-gray-400
            text-[12px]
            sm:text-[14px]

            outline-none
            "
        >
            <option>Select Gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
        </select>

        <Image
            src="/icons/dropdown.svg"
            alt="dropdown icon"
            width={20}
            height={20}
            className="
            pointer-events-none
            absolute
            right-4
            top-1/2
            -translate-y-1/2
            "
        />
        </div>
        </div>
      </div>

    </div>
  );
}