"use client";

import { useState } from "react";

const timeSlots = [
  {
    id: "morning",
    label: "เช้า",
    base: "border-gray-300 text-gray-500 bg-white",
    hover:
      "hover:bg-[#BBDEF4] hover:border-[#BBDEF4] hover:text-white",
    active:
      "bg-[#BBDEF4] border-[#BBDEF4] text-white",
  },
  {
    id: "noon",
    label: "กลางวัน",
    base: "border-gray-300 text-gray-500 bg-white",
    hover:
      "hover:bg-[#F7E380] hover:border-[#F7E380] hover:text-white",
    active:
      "bg-[#F7E380] border-[#F7E380] text-white",
  },
  {
    id: "evening",
    label: "เย็น",
    base: "border-gray-300 text-gray-500 bg-white",
    hover:
      "hover:bg-[#FB9A92] hover:border-[#FB9A92] hover:text-white",
    active:
      "bg-[#FB9A92] border-[#FB9A92] text-white",
  },
];

export default function TimeSlotSelector() {
  const [selected, setSelected] = useState<string | null>(
    null
  );

  return (
    <div className="w-full space-y-2">
      <label
        className="
          block
          text-xs
          text-gray-700

          sm:text-sm
        "
      >
        เลือกช่วงเวลาทำงาน
      </label>

      <div
        className="
          grid
          w-full
          grid-cols-3
          gap-2

          sm:gap-3
          md:gap-4
        "
      >
        {timeSlots.map((slot) => {
          const isActive = selected === slot.id;

          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => setSelected(slot.id)}
              className={`
                min-w-0
                rounded-full
                border

                px-2
                py-2.5

                text-xs
                whitespace-nowrap

                transition-all
                duration-200

                sm:px-4
                sm:py-3
                sm:text-sm

                md:px-5
                md:text-base

                ${isActive ? slot.active : slot.base}
                ${!isActive ? slot.hover : ""}

                hover:scale-[1.03]
                active:scale-95
              `}
            >
              {slot.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}