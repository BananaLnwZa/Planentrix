"use client";

import { useRef, useState, forwardRef, useImperativeHandle } from "react";

import Worktime from "./Worktime";
import BusyDay, { type BusyDayHandle } from "./BusyDay";
import CustomDayDropdown from "./CustomDayDropdown";
import TimePicker24Hour from "./TimePicker24Hour";

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
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  
  // Working duration (hours, minutes)
  const continuousWorkingHoursRef = useRef<HTMLInputElement>(null);
  const continuousWorkingMinutesRef = useRef<HTMLInputElement>(null);
  
  // Break duration (hours, minutes)
  const breakHoursRef = useRef<HTMLInputElement>(null);
  const breakMinutesRef = useRef<HTMLInputElement>(null);
  
  const busyDayRef = useRef<BusyDayHandle>(null);

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

  const handleStartTimeChange = (value: string) => {
    setStartTime(value);
    setTimeError(getWorkTimeError(value, endTime));
  };

  const handleEndTimeChange = (value: string) => {
    setEndTime(value);
    setTimeError(getWorkTimeError(startTime, value));
  };

  // Handle save constraints
  useImperativeHandle(ref, () => ({
    getFormData: async () => {
      const continuousWorkingHours = continuousWorkingHoursRef.current?.value || "0";
      const continuousWorkingMinutes = continuousWorkingMinutesRef.current?.value || "0";
      const breakHours = breakHoursRef.current?.value || "0";
      const breakMinutes = breakMinutesRef.current?.value || "0";
      const currentTimeError = getWorkTimeError(
        startTime,
        endTime,
        true
      );

      setTimeError(currentTimeError);

      if (currentTimeError) {
        return null;
      }

      const continuousDurationMinutes = calculateMinutes(continuousWorkingHours, continuousWorkingMinutes);
      const breakDurationMinutes = calculateMinutes(breakHours, breakMinutes);

      const constraints: ConstraintFormData = {
        day_off: selectedDay,
        continuous_working_duration: continuousDurationMinutes || null,
        break: breakDurationMinutes || null,
        start_time: startTime || null,
        end_time: endTime || null,
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
            <TimePicker24Hour
              id="start-work-time"
              value={startTime}
              onChange={handleStartTimeChange}
              ariaLabel="เวลาเริ่มทำงาน"
              ariaInvalid={Boolean(timeError)}
              ariaDescribedBy={timeError ? "work-time-error" : undefined}
              iconSize={22}
              className={`
                h-[48px]
                w-full
                rounded-full
                border
                bg-white
                pl-4
                pr-8
                text-sm
                text-gray-500
                outline-none

                ${
                  timeError
                    ? "border-red-500 bg-red-50/40 focus:border-red-500"
                    : "border-gray-300 focus:border-pink-300"
                }

                sm:h-[52px]
                sm:pl-5
                sm:pr-9
                md:h-[56px]
                md:pl-6
                md:pr-10
                md:text-base
              `}
            />
          </div>
        </div>

        {/* เวลาสิ้นสุดการทำงาน */}
        <div className="w-full space-y-2">
          <label className="block text-xs text-gray-700 sm:text-sm">
            เวลาสิ้นสุดการทำงาน
          </label>

          <div className="relative w-full max-w-[200px]">
            <TimePicker24Hour
              id="end-work-time"
              value={endTime}
              onChange={handleEndTimeChange}
              ariaLabel="เวลาสิ้นสุดการทำงาน"
              ariaInvalid={Boolean(timeError)}
              ariaDescribedBy={timeError ? "work-time-error" : undefined}
              iconSize={22}
              className={`
                h-[48px]
                w-full
                rounded-full
                border
                bg-white
                pl-4
                pr-8
                text-sm
                text-gray-500
                outline-none

                ${
                  timeError
                    ? "border-red-500 bg-red-50/40 focus:border-red-500"
                    : "border-gray-300 focus:border-pink-300"
                }

                sm:h-[52px]
                sm:pl-5
                sm:pr-9
                md:h-[56px]
                md:pl-6
                md:pr-11
                md:text-base
              `}
            />
          </div>
          {timeError && (
            <p
              id="work-time-error"
              className="max-w-[280px] rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-600"
              role="alert"
            >
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
