"use client";

import { useEffect, useState } from "react";
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
    color: "bg-pink-500",
  },
  {
    id: "Mon",
    color: "bg-yellow-400",
  },
  {
    id: "Tue",
    color: "bg-pink-300",
  },
  {
    id: "Wed",
    color: "bg-green-400",
  },
  {
    id: "Thu",
    color: "bg-orange-400",
  },
  {
    id: "Fri",
    color: "bg-sky-400",
  },
  {
    id: "Sat",
    color: "bg-purple-300",
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
              onClick={() =>
                setSelectedDay(day.id)
              }
              className={`
                px-4
                py-2
                rounded-full
                text-white
                font-semibold
                shadow
                transition-all

                ${day.color}

                ${
                  selectedDay === day.id
                    ? "ring-4 ring-white scale-110"
                    : "hover:scale-105"
                }
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
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="
            w-[140px]
            border
            border-gray-300
            rounded-full
            pl-4
            pr-10
            py-2
            text-gray-500
            outline-none
            "
        />

        <Image
            src="/icons/clock.svg"
            alt="clock"
            width={18}
            height={18}
            className="
            absolute
            right-4
            top-1/2
            -translate-y-1/2
            pointer-events-none
            "
        />
        </div>

        <span className="text-gray-500">-</span>

        {/* End Time */}
        <div className="relative">
            <input
            type="time"
            value={endTime}
            onChange={(e) =>
                setEndTime(e.target.value)
            }
            className="
                w-[140px]
                border
                border-gray-300
                rounded-full
                pl-4
                pr-10
                py-2
                text-gray-500
                outline-none
            "
            />

            <Image
            src="/icons/clock.svg"
            alt="clock"
            width={18}
            height={18}
            className="
                absolute
                right-4
                top-1/2
                -translate-y-1/2
                pointer-events-none
            "
            />
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