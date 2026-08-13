"use client";

import { useState } from "react";
import TimePicker24Hour from "@/components/common/TimePicker24Hour";

type EditItem = {
  id: string;
  day: string;
  start: string;
  end: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (
    day: string,
    start: string,
    end: string
  ) => void;

  editItem?: EditItem | null;
};

const days = [
  {
    id: "Sun",
    color: "bg-rose-200",
    border: "border-rose-400",
    hover: "hover:border-rose-400",
    selected: "border-rose-400 text-white",
  },
  {
    id: "Mon",
    color: "bg-amber-200",
    border: "border-amber-400",
    hover: "hover:border-amber-400",
    selected: "border-amber-400 text-white",
  },
  {
    id: "Tue",
    color: "bg-fuchsia-200",
    border: "border-fuchsia-400",
    hover: "hover:border-fuchsia-400",
    selected: "border-fuchsia-400 text-white",
  },
  {
    id: "Wed",
    color: "bg-emerald-200",
    border: "border-emerald-400",
    hover: "hover:border-emerald-400",
    selected: "border-emerald-400 text-white",
  },
  {
    id: "Thu",
    color: "bg-orange-200",
    border: "border-orange-400",
    hover: "hover:border-orange-400",
    selected: "border-orange-400 text-white",
  },
  {
    id: "Fri",
    color: "bg-sky-200",
    border: "border-sky-400",
    hover: "hover:border-sky-400",
    selected: "border-sky-400 text-white",
  },
  {
    id: "Sat",
    color: "bg-violet-200",
    border: "border-violet-400",
    hover: "hover:border-violet-400",
    selected: "border-violet-200 text-white",
  },
];

export default function BusyDayModal({
  open,
  onClose,
  onConfirm,
  editItem,
}: Props) {
  const [selectedDay, setSelectedDay] =
    useState(editItem?.day || "Mon");

  const [startTime, setStartTime] =
    useState(editItem?.start || "");

  const [endTime, setEndTime] =
    useState(editItem?.end || "");

  const [timeError, setTimeError] =
    useState<string | null>(null);

  const getTimeError = (start: string, end: string): string | null => {
    if (!start || !end) {
      return "กรุณาเลือกเวลาเริ่มต้นและเวลาสิ้นสุดให้ครบ";
    }

    if (start >= end) {
      return "เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด";
    }

    return null;
  };

  const handleStartTimeChange = (value: string) => {
    setStartTime(value);
    setTimeError(value && endTime ? getTimeError(value, endTime) : null);
  };

  const handleEndTimeChange = (value: string) => {
    setEndTime(value);
    setTimeError(startTime && value ? getTimeError(startTime, value) : null);
  };

  const handleConfirm = () => {
    const currentTimeError = getTimeError(startTime, endTime);
    setTimeError(currentTimeError);

    if (currentTimeError) {
      return;
    }

    onConfirm(selectedDay, startTime, endTime);
  };

  if (!open) return null;

  return (
    <div
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="
        fixed
        inset-0
        bg-transparent
        backdrop-blur-[3px]
        flex
        items-center
        justify-center
        z-[9999]
      "
    >
      <div
        className="
          relative
          w-[400px]
          rounded-[20px]
          bg-white
          p-6
          shadow-xl
        "
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="
            absolute
            right-4
            top-3
            text-pink-500
            text-3xl
            leading-none
          "
        >
          ×
        </button>

        <h3
          className="
            text-center
            text-xl
            mb-6
            text-black
          "
        >
          กรุณาเลือกวันและเวลาที่ไม่ว่างประจำ
        </h3>

        {/* Days */}
        <div
          className="
            flex
            flex-wrap
            justify-center
            gap-2
            mb-8
          "
        >
          {days.map((day) => (
            <button
              key={day.id}
              type="button"
              onClick={() => setSelectedDay(day.id)}
              className={`
                px-4
                py-2
                rounded-full
                text-gray-800
                font-semibold
                shadow
                transition-all
                transition-colors
                border-2
                border-transparent
                hover:opacity-80
                active:opacity-70
                active:scale-105
                focus:outline-none

                ${day.color}
                ${day.hover}

                ${
                  selectedDay === day.id
                    ? `${day.selected} ring-4 ring-white scale-110`
                    : "hover:scale-105"
                }

                active:!border-transparent
                active:!ring-0
              `}
            >
              {day.id}
            </button>
          ))}
        </div>

        {/* Time */}
        <div
        className="
            flex
            items-center
            justify-center
            gap-3
            mb-6
        "
        >
        {/* Start Time */}
        <div className="relative w-[112px] sm:w-[120px]">
          <TimePicker24Hour
            id="busy-start-time"
            value={startTime}
            onChange={handleStartTimeChange}
            ariaLabel="เวลาเริ่มต้น"
            ariaInvalid={Boolean(timeError)}
            ariaDescribedBy={timeError ? "busy-time-error" : undefined}
            iconSize={21}
            className={`w-full
              h-[42px]
              border
              ${timeError ? "border-red-500" : "border-gray-300"}
              rounded-full
              px-3
              text-sm
              leading-none
              text-gray-500
              outline-none
            `}
          />
        </div>

        <span className="text-gray-500">-</span>

        {/* End Time */}
        <div className="relative w-[112px] sm:w-[120px]">
          <TimePicker24Hour
            id="busy-end-time"
            value={endTime}
            onChange={handleEndTimeChange}
            ariaLabel="เวลาสิ้นสุด"
            ariaInvalid={Boolean(timeError)}
            ariaDescribedBy={timeError ? "busy-time-error" : undefined}
            iconSize={21}
            className={`w-full
              h-[42px]
              border
              ${timeError ? "border-red-500" : "border-gray-300"}
              rounded-full
              px-3
              text-sm
              leading-none
              text-gray-500
              outline-none
            `}
          />
        </div>
        </div>
        {timeError && (
          <p
            id="busy-time-error"
            className="mb-4 text-center text-xs text-red-500"
            role="alert"
          >
            {timeError}
          </p>
        )}

        {/* Confirm */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleConfirm}
            className="
              px-8
              py-2
              rounded-full
              border
              border-gray-300

              text-black

              transition-all
              duration-200

              hover:bg-[#B5E48C]
              hover:border-[#8BC98F]
              hover:text-white

              cursor-pointer
            "
          >
            {editItem ? "บันทึก" : "ยืนยัน"}
          </button>
        </div>
      </div>
    </div>
  );
}
