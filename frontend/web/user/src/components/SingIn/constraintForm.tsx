"use client";

import Image from "next/image";
import { type RefObject, useRef, useState, forwardRef, useImperativeHandle } from "react";

import Worktime from "./Worktime";
import BusyDay, { type BusyDayHandle } from "./BusyDay";
import CustomDayDropdown from "./CustomDayDropdown";

interface ConstraintFormData {
  day_off: number | null;
  continuous_working_duration: number | null;
  break: number | null;
  start_time: string | null;
  end_time: string | null;
  time_preference: number | null;
}

interface BusyDayData {
  day: number;
  start: string;
  end: string;
}

export interface ConstraintFormHandle {
  getFormData: () => Promise<{
    constraints: ConstraintFormData;
    busyDays: BusyDayData[];
  } | null>;
}

const ConstraintForm = forwardRef<ConstraintFormHandle>(function ConstraintForm(_, ref) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [timePreference, setTimePreference] = useState<number | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  
  // Working duration (hours, minutes)
  const continuousWorkingHoursRef = useRef<HTMLInputElement>(null);
  const continuousWorkingMinutesRef = useRef<HTMLInputElement>(null);
  
  // Break duration (hours, minutes)
  const breakHoursRef = useRef<HTMLInputElement>(null);
  const breakMinutesRef = useRef<HTMLInputElement>(null);
  
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);
  const busyDayRef = useRef<BusyDayHandle>(null);

  const openTimePicker = (ref: RefObject<HTMLInputElement | null>) => {
    const input = ref.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.focus();
    }
  };

  // Convert 24hr format to 12hr AM/PM format
  const convertTimeToAmPm = (time: string): string => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour.toString().padStart(2, "0")}:${minutes} ${suffix}`;
  };

  // Convert 12hr AM/PM format to 24hr format for database
  const convertAmPmTo24hr = (timeAmPm: string): string => {
    if (!timeAmPm) return "";
    const parts = timeAmPm.split(" ");
    const time = parts[0];
    const period = parts[1];
    const [hours, minutes] = time.split(":");
    let hour = parseInt(hours);

    if (period === "PM" && hour !== 12) {
      hour += 12;
    } else if (period === "AM" && hour === 12) {
      hour = 0;
    }

    return `${hour.toString().padStart(2, "0")}:${minutes}`;
  };

  // Calculate minutes from hours and minutes
  const calculateMinutes = (hours: string, minutes: string): number => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    return h * 60 + m;
  };

  const getWorkTimeError = (
    startTime: string,
    endTime: string,
    requireCompletePair = false
  ): string | null => {
    if (requireCompletePair && Boolean(startTime) !== Boolean(endTime)) {
      return "กรุณาเลือกเวลาเริ่มต้นและเวลาสิ้นสุดให้ครบ";
    }

    if (startTime && endTime && startTime >= endTime) {
      return "เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด";
    }

    return null;
  };

  const handleWorkTimeChange = () => {
    const startTime = startTimeRef.current?.value || "";
    const endTime = endTimeRef.current?.value || "";
    setTimeError(getWorkTimeError(startTime, endTime));
  };

  // Handle save constraints
  useImperativeHandle(ref, () => ({
    getFormData: async () => {
      const continuousWorkingHours = continuousWorkingHoursRef.current?.value || "0";
      const continuousWorkingMinutes = continuousWorkingMinutesRef.current?.value || "0";
      const breakHours = breakHoursRef.current?.value || "0";
      const breakMinutes = breakMinutesRef.current?.value || "0";
      const startTime = startTimeRef.current?.value;
      const endTime = endTimeRef.current?.value;
      const currentTimeError = getWorkTimeError(
        startTime || "",
        endTime || "",
        true
      );

      setTimeError(currentTimeError);

      if (currentTimeError) {
        if (!startTime) {
          startTimeRef.current?.focus();
        } else {
          endTimeRef.current?.focus();
        }
        return null;
      }

      // Convert time to AM/PM first, then to 24hr for database
      const startTimeAmPm = startTime ? convertTimeToAmPm(startTime) : null;
      const endTimeAmPm = endTime ? convertTimeToAmPm(endTime) : null;
      const startTime24hr = startTimeAmPm ? convertAmPmTo24hr(startTimeAmPm) : null;
      const endTime24hr = endTimeAmPm ? convertAmPmTo24hr(endTimeAmPm) : null;

      const continuousDurationMinutes = calculateMinutes(continuousWorkingHours, continuousWorkingMinutes);
      const breakDurationMinutes = calculateMinutes(breakHours, breakMinutes);

      const constraints: ConstraintFormData = {
        day_off: selectedDay,
        continuous_working_duration: continuousDurationMinutes || null,
        break: breakDurationMinutes || null,
        start_time: startTime24hr,
        end_time: endTime24hr,
        time_preference: timePreference,
      };

      const busyDays = await busyDayRef.current?.getFormData?.() || [];

      return {
        constraints,
        busyDays,
      };
    },
  }));

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
                ref={continuousWorkingHoursRef}
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
                ref={continuousWorkingMinutesRef}
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
                ref={breakHoursRef}
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
                ref={breakMinutesRef}
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
              ref={startTimeRef}
              id="start-work-time"
              type="time"
              onChange={handleWorkTimeChange}
              aria-invalid={Boolean(timeError)}
              aria-describedby={timeError ? "work-time-error" : undefined}
              className="
                appearance-none
                h-[48px]
                w-full
                rounded-full
                border
                border-gray-300
                bg-white
                pl-4
                pr-8
                text-sm
                text-gray-500
                outline-none
                [color-scheme:light]
                focus:border-pink-300

                sm:h-[52px]
                sm:pl-5
                sm:pr-9
                md:h-[56px]
                md:pl-6
                md:pr-10
                md:text-base
              "
            />
            <button
              type="button"
              onClick={() => openTimePicker(startTimeRef)}
              className="
                absolute
                right-5
                inset-y-0
                flex
                h-full
                w-5
                cursor-pointer
                items-center
                justify-center
                text-gray-500

                sm:right-5
                md:right-5
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
            </button>
          </div>
        </div>

        {/* เวลาสิ้นสุดการทำงาน */}
        <div className="w-full space-y-2">
          <label className="block text-xs text-gray-700 sm:text-sm">
            เวลาสิ้นสุดการทำงาน
          </label>

          <div className="relative w-full max-w-[200px]">
            <input
              ref={endTimeRef}
              id="end-work-time"
              type="time"
              onChange={handleWorkTimeChange}
              aria-invalid={Boolean(timeError)}
              aria-describedby={timeError ? "work-time-error" : undefined}
              className="
                appearance-none
                h-[48px]
                w-full
                rounded-full
                border
                border-gray-300
                bg-white
                pl-4
                pr-8
                text-sm
                text-gray-500
                outline-none
                [color-scheme:light]
                focus:border-pink-300

                sm:h-[52px]
                sm:pl-5
                sm:pr-9
                md:h-[56px]
                md:pl-6
                md:pr-11
                md:text-base
              "
            />
            <button
              type="button"
              onClick={() => openTimePicker(endTimeRef)}
              className="
                absolute
                right-5
                inset-y-0
                flex
                h-full
                w-5
                cursor-pointer
                items-center
                justify-center
                text-gray-500

                sm:right-5
                md:right-5
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
            </button>
          </div>
          {timeError && (
            <p id="work-time-error" className="text-xs text-red-500" role="alert">
              {timeError}
            </p>
          )}
        </div>

        <Worktime onChange={setTimePreference} />

        <BusyDay ref={busyDayRef} />
      </div>
    </div>
  );
});

export default ConstraintForm;
