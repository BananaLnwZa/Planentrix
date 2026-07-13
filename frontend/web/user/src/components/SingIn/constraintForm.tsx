"use client";

import Image from "next/image";
import { useState } from "react";

import Worktime from "./Worktime";
import BusyDay from "./BusyDay";
import CustomDayDropdown from "./CustomDayDropdown";

export default function LoginForm() {
  const [selectedDay, setSelectedDay] = useState("");

  return (
    <div
      className="
        w-full
        max-w-[500px]
        min-h-[420px]
        rounded-2xl
        bg-white/70
        p-4
        shadow-md
        backdrop-blur-sm

        sm:p-6
        md:min-h-[450px]
        md:p-8
        lg:p-10
      "
    >
      <h2
        className="
          mb-6
          text-center
          text-2xl
          font-medium
          text-black

          sm:mb-8
          sm:text-3xl
          md:text-4xl
        "
      >
        Constraint
      </h2>

      <div className="flex flex-col gap-5 sm:gap-6">
        {/* วันหยุด */}
        <div className="space-y-2">
          <label className="block text-xs text-gray-700 sm:text-sm">
            วันหยุด
          </label>

          <CustomDayDropdown
            value={selectedDay}
            onChange={setSelectedDay}
          />
        </div>

        {/* ระยะเวลาทำงานต่อเนื่อง */}
        <div className="space-y-2">
          <label className="block text-xs text-gray-700 sm:text-sm">
            ระยะเวลาทำงานต่อเนื่อง
          </label>

          <div className="flex flex-wrap gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                placeholder="0"
                className="
                  h-[40px]
                  w-[72px]
                  rounded-full
                  border
                  border-gray-300
                  bg-white
                  px-3
                  text-center
                  text-xs
                  text-gray-500
                  outline-none
                  focus:border-pink-300

                  sm:h-[44px]
                  sm:w-20
                  sm:text-sm
                "
              />

              <span className="text-xs text-gray-600 sm:text-sm">
                ชั่วโมง
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={59}
                placeholder="0"
                className="
                  h-[40px]
                  w-[72px]
                  rounded-full
                  border
                  border-gray-300
                  bg-white
                  px-3
                  text-center
                  text-xs
                  text-gray-500
                  outline-none
                  focus:border-pink-300

                  sm:h-[44px]
                  sm:w-20
                  sm:text-sm
                "
              />

              <span className="text-xs text-gray-600 sm:text-sm">
                นาที
              </span>
            </div>
          </div>
        </div>

        {/* ระยะเวลาพัก */}
        <div className="space-y-2">
          <label className="block text-xs text-gray-700 sm:text-sm">
            ระยะเวลาพัก
          </label>

          <div className="flex flex-wrap gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                placeholder="0"
                className="
                  h-[40px]
                  w-[72px]
                  rounded-full
                  border
                  border-gray-300
                  bg-white
                  px-3
                  text-center
                  text-xs
                  text-gray-500
                  outline-none
                  focus:border-pink-300

                  sm:h-[44px]
                  sm:w-20
                  sm:text-sm
                "
              />

              <span className="text-xs text-gray-600 sm:text-sm">
                ชั่วโมง
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={59}
                placeholder="0"
                className="
                  h-[40px]
                  w-[72px]
                  rounded-full
                  border
                  border-gray-300
                  bg-white
                  px-3
                  text-center
                  text-xs
                  text-gray-500
                  outline-none
                  focus:border-pink-300

                  sm:h-[44px]
                  sm:w-20
                  sm:text-sm
                "
              />

              <span className="text-xs text-gray-600 sm:text-sm">
                นาที
              </span>
            </div>
          </div>
        </div>

        {/* เวลาเริ่มทำงาน */}
        <div className="w-full space-y-2">
          <label className="block text-xs text-gray-700 sm:text-sm">
            เวลาเริ่มทำงาน
          </label>

          <div className="relative w-full max-w-[200px]">
            <input
              type="time"
              className="
                h-[48px]
                w-full
                rounded-full
                border
                border-gray-300
                bg-white
                pl-4
                pr-14
                text-sm
                text-gray-500
                outline-none
                [color-scheme:light]
                focus:border-pink-300

                sm:h-[52px]
                sm:pl-5
                sm:pr-16
                md:h-[56px]
                md:pl-6
                md:text-base
              "
            />

            <div
              className="
                pointer-events-none
                absolute
                right-2
                top-1/2
                flex
                h-9
                w-9
                -translate-y-1/2
                items-center
                justify-center

                sm:right-3
                sm:h-10
                sm:w-10
              "
            >
              <Image
                src="/icons/clock.svg"
                alt="clock"
                width={22}
                height={22}
                className="
                  h-[18px]
                  w-[18px]

                  sm:h-[20px]
                  sm:w-[20px]
                  md:h-[22px]
                  md:w-[22px]
                "
              />
            </div>
          </div>
        </div>

        {/* เวลาสิ้นสุดการทำงาน */}
        <div className="w-full space-y-2">
          <label className="block text-xs text-gray-700 sm:text-sm">
            เวลาสิ้นสุดการทำงาน
          </label>

          <div className="relative w-full max-w-[200px]">
            <input
              type="time"
              className="
                h-[48px]
                w-full
                rounded-full
                border
                border-gray-300
                bg-white
                pl-4
                pr-14
                text-sm
                text-gray-500
                outline-none
                [color-scheme:light]
                focus:border-pink-300

                sm:h-[52px]
                sm:pl-5
                sm:pr-16
                md:h-[56px]
                md:pl-6
                md:text-base
              "
            />

            <div
              className="
                pointer-events-none
                absolute
                right-2
                top-1/2
                flex
                h-9
                w-9
                -translate-y-1/2
                items-center
                justify-center

                sm:right-3
                sm:h-10
                sm:w-10
              "
            >
              <Image
                src="/icons/clock.svg"
                alt="clock"
                width={22}
                height={22}
                className="
                  h-[18px]
                  w-[18px]

                  sm:h-[20px]
                  sm:w-[20px]
                  md:h-[22px]
                  md:w-[22px]
                "
              />
            </div>
          </div>
        </div>

        <Worktime />

        <BusyDay />
      </div>
    </div>
  );
}