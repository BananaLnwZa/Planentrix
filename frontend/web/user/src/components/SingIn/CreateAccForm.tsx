"use client";

import SelectGender from "./SelectGender";

export default function LoginForm() {
  return (
    <div
      className="
        w-full
        max-w-[500px]

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
          text-center
          text-3xl
          font-medium
          text-black

          sm:text-4xl
          md:mb-8
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
              text-gray-700

              sm:text-sm
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
              bg-white

              px-4
              py-2.5

              text-[11px]
              text-gray-500
              outline-none

              sm:px-5
              sm:py-3
              sm:text-[12px]

              md:text-[14px]
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
              text-gray-700

              sm:text-sm
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
              bg-white

              px-4
              py-2.5

              text-[11px]
              text-gray-500
              outline-none

              sm:px-5
              sm:py-3
              sm:text-[12px]

              md:text-[14px]
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
              text-gray-700

              sm:text-sm
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
              bg-white

              px-4
              py-2.5

              text-[11px]
              text-gray-500
              outline-none

              sm:px-5
              sm:py-3
              sm:text-[12px]

              md:text-[14px]
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
              text-gray-700
              sm:text-sm
            "
          >
            Birth Date
          </label>

          <div className="w-1/2 min-w-[180px]">
            <input
              type="date"
              className="
                custom-date
                h-[44px]
                w-full
                rounded-full
                border
                border-gray-300
                bg-white
                px-4
                text-[12px]
                text-gray-400
                outline-none

                sm:h-[48px]
                sm:px-5
                sm:text-[14px]
              "
            />
          </div>
        </div>

        {/* Select Gender */}
        <div className="w-full sm:w-1/2">
          <SelectGender />
        </div>
      </div>
    </div>
  );
}