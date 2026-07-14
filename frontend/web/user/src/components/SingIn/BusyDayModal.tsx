"use client";

import { useEffect, useState, useRef, type RefObject } from "react";
import Image from "next/image";

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
    selected: "border-violet-400 text-white",
  },
];

export default function BusyDayModal({
  open,
  onClose,
  onConfirm,
  editItem,
}: Props) {
  const [selectedDay, setSelectedDay] =
    useState("Mon");

  const [startTime, setStartTime] =
    useState("");

  const [endTime, setEndTime] =
    useState("");

  const startRef = useRef<HTMLInputElement | null>(null);
  const endRef = useRef<HTMLInputElement | null>(null);

  const openTimePicker = (ref: RefObject<HTMLInputElement | null>) => {
    const input = ref.current;
    if (!input) return;

    if (typeof (input as any).showPicker === "function") {
      (input as any).showPicker();
    } else {
      input.focus();
    }
  };

  // โหลดข้อมูลเดิมตอนกดแก้ไข
  useEffect(() => {
    if (editItem) {
      setSelectedDay(editItem.day);
      setStartTime(editItem.start);
      setEndTime(editItem.end);
    } else {
      setSelectedDay("Mon");
      setStartTime("");
      setEndTime("");
    }
  }, [editItem, open]);

  if (!open) return null;

  return (
    <div
      className="
        fixed
        inset-0
        bg-black/30
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
            gap-3
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
        <div className="relative">
          <input
            ref={startRef}
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="
              w-[145px]
              border
              border-gray-300
              rounded-full
              pl-4
              pr-6
              py-2
              text-sm
              leading-none
              text-gray-500
              outline-none
            "
          />

          <button
            type="button"
            onClick={() => openTimePicker(startRef)}
            className="
              absolute
              right-3
              top-1/2
              -translate-y-1/2
              flex
              items-center
              justify-center
              h-6
              w-6
              rounded-full
            "
            aria-label="Open start time picker"
          >
            <Image
              src="/icons/clock.svg"
              alt="clock"
              width={18}
              height={18}
              className="h-[18px] w-[18px]"
            />
          </button>
        </div>

        <span className="text-gray-500">-</span>

        {/* End Time */}
        <div className="relative">
          <input
            ref={endRef}
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="
              w-[145px]
              border
              border-gray-300
              rounded-full
              pl-4
              pr-6
              py-2
              text-sm
              leading-none
              text-gray-500
              outline-none
            "
          />

          <button
            type="button"
            onClick={() => openTimePicker(endRef)}
            className="
              absolute
              right-3
              top-1/2
              -translate-y-1/2
              flex
              items-center
              justify-center
              h-6
              w-6
              rounded-full
            "
            aria-label="Open end time picker"
          >
            <Image
              src="/icons/clock.svg"
              alt="clock"
              width={18}
              height={18}
              className="h-[18px] w-[18px]"
            />
          </button>
        </div>
        </div>

        {/* Confirm */}
        <div className="text-center">
          <button
            type="button"
            onClick={() =>
              onConfirm(
                selectedDay,
                startTime,
                endTime
              )
            }
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