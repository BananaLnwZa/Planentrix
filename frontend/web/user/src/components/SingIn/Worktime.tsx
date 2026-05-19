"use client";

import { useState } from "react";

const timeSlots = [
  {
    id: "morning",
    label: "เช้า",
    base: "border-black-300 text-black",
    hover: "hover:bg-[#BBDEF4] border-[#BBDEF4] hover:text-white",
    active: "bg-[#BBDEF4] border-[#BBDEF4] text-white",
  },
  {
    id: "noon",
    label: "กลางวัน",
    base: "border-black-300 text-black",
    hover: "hover:bg-[#F7E380] border-[#F7E380] hover:text-white",
    active: "bg-[#F7E380] border-[#F7E380] text-white",
  },
  {
    id: "evening",
    label: "เย็น",
    base: "border-black-200 text-black",
    hover: "hover:bg-[#FB9A92] border-[#FB9A92] hover:text-white",
    active: "bg-[#FB9A92] border-[#FB9A92] text-white",
  },
];

export default function TimeSlotSelector() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-2 w-full">
      <label className="text-sm text-gray-700">
        เลือกช่วงเวลาทำงาน
      </label>

      <div className="flex gap-3 w-full">
        {timeSlots.map((slot) => {
          const isActive = selected === slot.id;

          return (
            <button
              key={slot.id}
              onClick={() => setSelected(slot.id)}
              className={`
                flex-1
                px-4 py-3
                rounded-full
                border
                text-sm
                transition-all duration-200

                ${isActive ? slot.active : slot.base}
                ${!isActive ? slot.hover : ""}

                hover:scale-105 active:scale-95
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