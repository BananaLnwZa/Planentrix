"use client";

import { useState, forwardRef, useImperativeHandle } from "react";
import BusyDayModal from "./BusyDayModal";
import { Pencil, Trash2 } from "lucide-react";

export type BusyDayFormData = {
  day: number; // 1-7 (Monday-Sunday)
  start: string; // HH:mm (24-hour format)
  end: string; // HH:mm (24-hour format)
};

type Item = BusyDayFormData & {
  id: string;
};

export interface BusyDayHandle {
  getFormData: () => Promise<BusyDayFormData[]>;
}

export interface BusyDayProps {
  onBusyDaysSaved?: () => void;
}

const FlatSchedule = forwardRef<BusyDayHandle, BusyDayProps>(function FlatSchedule(_, ref) {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  useImperativeHandle(ref, () => ({
    getFormData: async () => {
      return items.map((item) => ({
        day: item.day,
        start: item.start,
        end: item.end,
      }));
    },
  }));

  // Convert abbreviated day name to full name
  const abbreviatedToFullDayName = (abbr: string): string => {
    const dayMap: { [key: string]: string } = {
      "Sun": "Sunday",
      "Mon": "Monday",
      "Tue": "Tuesday",
      "Wed": "Wednesday",
      "Thu": "Thursday",
      "Fri": "Friday",
      "Sat": "Saturday",
    };
    return dayMap[abbr] || "Monday";
  };

  // Map day name to number (1-7)
  const dayNameToNumber = (dayName: string): number => {
    const dayMap: { [key: string]: number } = {
      "Monday": 1,
      "Tuesday": 2,
      "Wednesday": 3,
      "Thursday": 4,
      "Friday": 5,
      "Saturday": 6,
      "Sunday": 7,
    };
    return dayMap[dayName] || 1;
  };

  // Map day number to name
  const dayNumberToName = (dayNum: number): string => {
    const dayMap: { [key: number]: string } = {
      1: "Monday",
      2: "Tuesday",
      3: "Wednesday",
      4: "Thursday",
      5: "Friday",
      6: "Saturday",
      7: "Sunday",
    };
    return dayMap[dayNum] || "Monday";
  };

  const dayNumberToAbbreviation = (dayNum: number): string => {
    const dayMap: { [key: number]: string } = {
      1: "Mon",
      2: "Tue",
      3: "Wed",
      4: "Thu",
      5: "Fri",
      6: "Sat",
      7: "Sun",
    };
    return dayMap[dayNum] || "Mon";
  };

  // Note: Busy days are saved through the constraint form ref
  // No need to save separately here

  return (
    <div className="w-full max-w-md space-y-4">

      {/* TITLE */}
      <h2
        data-preserve-typography
        className="text-xs font-normal text-gray-700 sm:text-sm"
      >
        วันเวลาไม่ว่างประจำ
      </h2>

      {/* LIST */}
      <div className="border border-gray-300 rounded-2xl p-5 space-y-2 bg-white">

        {items.length === 0 && (
          <p className="text-sm text-gray-400 ">
            ยังไม่มีข้อมูล
          </p>
        )}

        {items.map((t) => (
          <div
            key={t.id}
            className="
              flex
              items-center
              justify-between
              text-sm
              py-2
            "
          >
            {/* Day */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-200" />

              <span className="w-24 text-gray-700">
                {dayNumberToName(t.day)}
              </span>
            </div>

            {/* Time */}
            <span className="text-gray-900 flex-1 text-center">
              {t.start} - {t.end}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingItem(t);
                  setOpen(true);
                }}
                className="
                  p-1.5
                  rounded-full
                  text-[#A9D7F5]
                  hover:bg-[#EAF6FD]
                  transition
                "
              >
                <Pencil size={16} />
              </button>

              <button
                type="button"
                onClick={() =>
                  setItems(
                    items.filter(
                      (item) => item.id !== t.id
                    )
                  )
                }
                className="
                  p-1.5
                  rounded-full
                  text-[#FF8E8E]
                  hover:bg-[#FFF0F0]
                  transition
                "
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

      </div>

      {/* ADD BUTTON */}
      <div className="flex justify-center">
        <button
          onClick={() => setOpen(true)}
          className="
            w-[130px]
            h-[48px]

            rounded-[24px]

            bg-[#A9D7F5]

            flex
            items-center
            justify-center

            text-white
            text-[34px]
            font-semibold
            leading-none

            shadow-sm

            transition-all
            duration-200

            hover:bg-[#9DD0F1]
            hover:scale-105

            active:scale-95
          "
        >
          +
        </button>
      </div>

      <BusyDayModal
        key={open ? editingItem?.id || "new" : "closed"}
        open={open}
        editItem={editingItem ? {
          id: editingItem.id,
          day: dayNumberToAbbreviation(editingItem.day),
          start: editingItem.start,
          end: editingItem.end,
        } : null}
        onClose={() => {
          setOpen(false);
          setEditingItem(null);
        }}
        onConfirm={(abbreviatedDay, start, end) => {
          const fullDayName = abbreviatedToFullDayName(abbreviatedDay);
          const dayNumber = dayNameToNumber(fullDayName);
          if (editingItem) {
            // แก้ไขรายการเดิม
            setItems(
              items.map((item) =>
                item.id === editingItem.id
                  ? {
                    ...item,
                    day: dayNumber,
                    start,
                    end,
                  }
                  : item
              )
            );
          } else {
            // เพิ่มรายการใหม่
            setItems([
              ...items,
              {
                id: crypto.randomUUID(),
                day: dayNumber,
                start,
                end,
              },
            ]);
          }

          setEditingItem(null);
          setOpen(false);
        }}
      />

    </div>
  );
});

export default FlatSchedule;
