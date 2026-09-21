"use client";

import { useMemo, useState, forwardRef, useImperativeHandle } from "react";

import BusyDay from "./BusyDay";
import DaySelect from "@/components/common/DaySelect";
import TimePicker24Hour from "@/components/common/TimePicker24Hour";
import { validateConstraintInput } from "@/utils/constraintValidation";

interface ConstraintFormData {
  day_off: number | null;
  continuous_working_duration: number | null;
  break: number | null;
  start_time: string | null;
  end_time: string | null;
}

interface BusyDayData {
  day: number;
  start: string;
  end: string;
}

const isContinuousDurationError = (message: string) =>
  message.startsWith("กรุณาระบุระยะเวลาทำงานต่อเนื่อง") ||
  message.startsWith("ระยะเวลาทำงานต่อเนื่อง") ||
  message.startsWith("ระยะเวลาทำงานต้อง");

const isBreakDurationError = (message: string) =>
  message.startsWith("ระยะเวลาพัก");

export interface ConstraintFormHandle {
  getFormData: () => Promise<{
    constraints: ConstraintFormData;
    busyDays: BusyDayData[];
  } | null>;
}

const ConstraintForm = forwardRef<ConstraintFormHandle>(function ConstraintForm(_, ref) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [continuousWorkingHours, setContinuousWorkingHours] = useState("");
  const [continuousWorkingMinutes, setContinuousWorkingMinutes] = useState("");
  const [breakHours, setBreakHours] = useState("");
  const [breakMinutes, setBreakMinutes] = useState("");
  const [busyDays, setBusyDays] = useState<BusyDayData[]>([]);
  const [didAttemptSave, setDidAttemptSave] = useState(false);

  // Calculate minutes from hours and minutes
  const parseDuration = (hours: string, minutes: string) => {
    const parsedHours = hours.trim() === "" ? 0 : Number(hours);
    const parsedMinutes = minutes.trim() === "" ? 0 : Number(minutes);
    const valid =
      Number.isInteger(parsedHours) &&
      Number.isInteger(parsedMinutes) &&
      parsedHours >= 0 &&
      parsedMinutes >= 0 &&
      parsedMinutes <= 59;
    return {
      value: valid ? parsedHours * 60 + parsedMinutes : null,
      valid,
    };
  };

  const continuousDuration = parseDuration(
    continuousWorkingHours,
    continuousWorkingMinutes
  );
  const breakDuration = parseDuration(breakHours, breakMinutes);
  const constraintValidation = useMemo(() => {
    const result = validateConstraintInput({
      dayOff: selectedDay,
      continuousWorkingDuration: continuousDuration.valid
        ? continuousDuration.value
        : -1,
      breakDuration: breakDuration.valid ? breakDuration.value : -1,
      startTime,
      endTime,
      busyDays,
    });
    const durationErrors: string[] = [];
    if (!continuousDuration.valid) {
      durationErrors.push("ระยะเวลาทำงานต้องเป็นชั่วโมงตั้งแต่ 0 ขึ้นไป และนาที 0–59");
    }
    if (!breakDuration.valid) {
      durationErrors.push("ระยะเวลาพักต้องเป็นชั่วโมงตั้งแต่ 0 ขึ้นไป และนาที 0–59");
    }
    return { ...result, errors: [...durationErrors, ...result.errors] };
  }, [
    breakDuration.valid,
    breakDuration.value,
    busyDays,
    continuousDuration.valid,
    continuousDuration.value,
    endTime,
    selectedDay,
    startTime,
  ]);
  const showConstraintErrors =
    didAttemptSave ||
    continuousWorkingHours !== "" ||
    continuousWorkingMinutes !== "" ||
    breakHours !== "" ||
    breakMinutes !== "" ||
    busyDays.length > 0;
  const continuousDurationErrors = constraintValidation.errors.filter(
    isContinuousDurationError
  );
  const breakDurationErrors = constraintValidation.errors.filter(
    isBreakDurationError
  );

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
      setDidAttemptSave(true);
      const currentTimeError = getWorkTimeError(
        startTime,
        endTime,
        true
      );

      setTimeError(currentTimeError);

      if (currentTimeError || constraintValidation.errors.length > 0) {
        return null;
      }

      const constraints: ConstraintFormData = {
        day_off: selectedDay,
        continuous_working_duration: continuousDuration.value,
        break: breakDuration.value,
        start_time: startTime || null,
        end_time: endTime || null,
      };

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

          <DaySelect
            value={selectedDay}
            onChange={setSelectedDay}
            locale="en"
            placeholder="เลือกวันที่ต้องการหยุด"
            className="max-w-[240px]"
          />
        </div>

        {/* ระยะเวลาทำงานต่อเนื่อง */}
        <div className="space-y-2">
          <label className="block text-xs text-gray-700 sm:text-sm">
            ระยะเวลาทำงานต่อเนื่อง{" "}
            <span className="text-red-500" aria-hidden="true">*</span>
          </label>

          <div className="flex flex-wrap gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={1}
                value={continuousWorkingHours}
                onChange={(event) => setContinuousWorkingHours(event.target.value)}
                placeholder="0"
                aria-invalid={showConstraintErrors && continuousDurationErrors.length > 0}
                className={`
                  h-[40px]
                  w-[72px]
                  rounded-full
                  border
                  ${showConstraintErrors && continuousDurationErrors.length > 0 ? "border-red-400" : "border-gray-300"}
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
                `}
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
                step={1}
                value={continuousWorkingMinutes}
                onChange={(event) => setContinuousWorkingMinutes(event.target.value)}
                placeholder="0"
                aria-invalid={showConstraintErrors && continuousDurationErrors.length > 0}
                className={`
                  h-[40px]
                  w-[72px]
                  rounded-full
                  border
                  ${showConstraintErrors && continuousDurationErrors.length > 0 ? "border-red-400" : "border-gray-300"}
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
                `}
              />

              <span className="text-xs text-gray-600 sm:text-sm">
                นาที
              </span>
            </div>
          </div>
          {showConstraintErrors &&
            continuousDurationErrors.map((message) => (
              <p key={message} className="text-xs text-red-600" role="alert">
                {message}
              </p>
            ))}
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
                step={1}
                value={breakHours}
                onChange={(event) => setBreakHours(event.target.value)}
                placeholder="0"
                aria-invalid={showConstraintErrors && breakDurationErrors.length > 0}
                className={`
                  h-[40px]
                  w-[72px]
                  rounded-full
                  border
                  ${showConstraintErrors && breakDurationErrors.length > 0 ? "border-red-400" : "border-gray-300"}
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
                `}
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
                step={1}
                value={breakMinutes}
                onChange={(event) => setBreakMinutes(event.target.value)}
                placeholder="0"
                aria-invalid={showConstraintErrors && breakDurationErrors.length > 0}
                className={`
                  h-[40px]
                  w-[72px]
                  rounded-full
                  border
                  ${showConstraintErrors && breakDurationErrors.length > 0 ? "border-red-400" : "border-gray-300"}
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
                `}
              />

              <span className="text-xs text-gray-600 sm:text-sm">
                นาที
              </span>
            </div>
          </div>
          {showConstraintErrors &&
            breakDurationErrors.map((message) => (
              <p key={message} className="text-xs text-red-600" role="alert">
                {message}
              </p>
            ))}
        </div>

        {/* เวลาเริ่มทำงาน */}
        <div className="w-full space-y-2">
          <label className="block text-xs text-gray-700 sm:text-sm">
            เวลาเริ่มทำงาน{" "}
            <span className="text-red-500" aria-hidden="true">*</span>
          </label>

          <div className="relative w-[130px] max-w-full">
            <TimePicker24Hour
              id="start-work-time"
              value={startTime}
              onChange={handleStartTimeChange}
              ariaLabel="เวลาเริ่มทำงาน"
              ariaInvalid={Boolean(timeError)}
              ariaDescribedBy={timeError ? "work-time-error" : undefined}
              iconSize={22}
              className={`
                h-[44px]
                w-full
                rounded-full
                border
                bg-white
                pl-4
                pr-3
                text-sm
                text-gray-500
                outline-none

                ${
                  timeError
                    ? "border-red-500 bg-red-50/40 focus:border-red-500"
                    : "border-gray-300 focus:border-pink-300"
                }

                sm:h-[46px]
                sm:pl-4
                sm:pr-3
                md:h-[48px]
                md:pl-5
                md:pr-3
                md:text-base
              `}
            />
          </div>
        </div>

        {/* เวลาสิ้นสุดการทำงาน */}
        <div className="w-full space-y-2">
          <label className="block text-xs text-gray-700 sm:text-sm">
            เวลาสิ้นสุดการทำงาน{" "}
            <span className="text-red-500" aria-hidden="true">*</span>
          </label>

          <div className="relative w-[130px] max-w-full">
            <TimePicker24Hour
              id="end-work-time"
              value={endTime}
              onChange={handleEndTimeChange}
              ariaLabel="เวลาสิ้นสุดการทำงาน"
              ariaInvalid={Boolean(timeError)}
              ariaDescribedBy={timeError ? "work-time-error" : undefined}
              iconSize={22}
              className={`
                h-[44px]
                w-full
                rounded-full
                border
                bg-white
                pl-4
                pr-3
                text-sm
                text-gray-500
                outline-none

                ${
                  timeError
                    ? "border-red-500 bg-red-50/40 focus:border-red-500"
                    : "border-gray-300 focus:border-pink-300"
                }

                sm:h-[46px]
                sm:pl-4
                sm:pr-3
                md:h-[48px]
                md:pl-5
                md:pr-3
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

        <BusyDay onChange={setBusyDays} />

        {showConstraintErrors &&
          constraintValidation.errors
            .filter(
              (message) =>
                message !== timeError &&
                !isContinuousDurationError(message) &&
                !isBreakDurationError(message)
            )
            .map((message) => (
              <p
                key={message}
                className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-600"
                role="alert"
              >
                {message}
              </p>
            ))}

        {constraintValidation.warnings.map((message) => (
          <p
            key={message}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700"
            role="status"
          >
            {message}
          </p>
        ))}
      </div>
    </div>
  );
});

export default ConstraintForm;
