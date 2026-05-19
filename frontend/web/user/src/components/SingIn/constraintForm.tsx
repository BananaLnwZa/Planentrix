import Link from "next/link";
import Image from "next/image";
import Worktime from "./Worktime";
import BusyDay from "./BusyDay";

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
      <h2 className="mb-8 text-center text-3xl sm:text-4xl font-medium text-black">
        Constraint
      </h2>

      <div className="flex flex-col gap-4">

        {/* วันหยุด*/}
        <div className="space-y-2">
          <label className="text-sm text-gray-700">วันหยุด</label>

          <div className="relative w-2/3">
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
                text-gray-400
                outline-none
              "
            >
              <option>เลือกวันที่ต้องการหยุด</option>
              <option>Monday</option>
              <option>Tuesday</option>
              <option>Wednesday</option>
              <option>Thursday</option>
              <option>Friday</option>
              <option>Saturday</option>
              <option>Sunday</option>
            </select>

            <Image
              src="/icons/dropdown.svg"
              alt="dropdown icon"
              width={25}
              height={25}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
            />
          </div>
        </div>

        {/* ระยะเวลา */}
        <div className="space-y-2">
          <label className="text-sm text-gray-700">
            ระยะเวลาทำงานต่อเนื่อง
          </label>

          <div className="flex gap-4 w-2/3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                placeholder="0"
                className="
                  w-20
                  rounded-full
                  border
                  border-gray-300
                 text-gray-400
                  px-3
                  py-2.5
                  text-center
                  text-sm
                  outline-none
                "
              />
              <span className="text-sm text-gray-600">ชั่วโมง</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={59}
                placeholder="0"
                className="
                  w-20
                  rounded-full
                  border
                  text-gray-400
                  border-gray-300
                  px-3
                  py-2.5
                  text-center
                  text-sm
                  outline-none
                "
              />
              <span className="text-sm text-gray-600">นาที</span>
            </div>
          </div>
        </div>

        {/* ระยะเวลา */}
        <div className="space-y-2">
          <label className="text-sm text-gray-700">
            ระยะเวลาพัก
          </label>

          <div className="flex gap-4 w-2/3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                placeholder="0"
                className="
                  w-20
                  rounded-full
                  border
                  border-gray-300
                 text-gray-400
                  px-3
                  py-2.5
                  text-center
                  text-sm
                  outline-none
                "
              />
              <span className="text-sm text-gray-600">ชั่วโมง</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={59}
                placeholder="0"
                className="
                  w-20
                  rounded-full
                  border
                  text-gray-400
                  border-gray-300
                  px-3
                  py-2.5
                  text-center
                  text-sm
                  outline-none
                "
              />
              <span className="text-sm text-gray-600">นาที</span>
            </div>
          </div>
        </div>

    <div className="space-y-2 w-1/2">
    <label className="text-sm text-gray-700">
        เวลาเริ่มทำงาน
    </label>

    {/* ✅ ต้องมี relative */}
    <div className="relative">
    <input
        type="time"
        className="
        w-full
        rounded-full
        border
        border-gray-300
        px-10
        py-2.5
        text-gray-700
        outline-none
        "
    />

    {/* <Image
        src="/icons/clock.svg"
        alt="clock"
        width={18}
        height={18}
        className="
        absolute
        left-4
        top-1/2
        -translate-y-1/2
        pointer-events-none
        "
    /> */}
    </div>
    </div>

        <div className="space-y-2 w-1/2">
    <label className="text-sm text-gray-700">
        เวลาสิ้นสุดการทำงาน
    </label>

    {/* ✅ ต้องมี relative */}
    <div className="relative">
    <input
        type="time"
        className="
        w-full
        rounded-full
        border
        border-gray-300
        px-10
        py-2.5
        text-gray-700
        outline-none
        "
    />

    {/* <Image
        src="/icons/clock.svg"
        alt="clock"
        width={18}
        height={18}
        className="
        absolute
        left-4
        top-1/2
        -translate-y-1/2
        pointer-events-none
        "
    /> */}
    </div>
    </div>

    <Worktime />

        {/* วันไม่ว่างประจำ */}
        <div>
            <BusyDay />
        </div>

      </div>
    </div>
  );
}