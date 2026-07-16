"use client";

import { useState, forwardRef, useImperativeHandle } from "react";
import BusyDayModal from "./BusyDayModal";
import { Pencil, Trash2 } from "lucide-react";

type Item = {
  id: string;
  day: number; // 1-7 (Monday-Sunday)
  start: string; // HH:MM AM/PM
  end: string; // HH:MM AM/PM
};

interface BusyDayHandle {
  getFormData: () => Promise<Item[]>;
}

export interface BusyDayProps {
  onBusyDaysSaved?: () => void;
}

const FlatSchedule = forwardRef<BusyDayHandle, BusyDayProps>(function FlatSchedule({ onBusyDaysSaved }, ref) {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useImperativeHandle(ref, () => ({
    getFormData: async () => {
      return items.map((item) => ({
        ...item,
        start: convertAmPmTo24hr(item.start),
        end: convertAmPmTo24hr(item.end),
      }));
    },
  }));

  const [form, setForm] = useState({
    day: 1,
    start: "",
    end: "",
  });

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

  // Note: Busy days are saved through the constraint form ref
  // No need to save separately here

  return (
    <div className="w-full max-w-md space-y-4">

      {/* TITLE */}
      <h2 className="text-sm font-medium text-gray-700">
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
                  setForm({
                    day: t.day,
                    start: t.start,
                    end: t.end,
                  });
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
        open={open}
        editItem={editingItem ? {
          id: editingItem.id,
          day: dayNumberToName(editingItem.day),
          start: convertAmPmTo24hr(editingItem.start),
          end: convertAmPmTo24hr(editingItem.end),
        } : null}
        onClose={() => {
          setOpen(false);
          setEditingItem(null);
        }}
        onConfirm={(abbreviatedDay, start, end) => {
          const fullDayName = abbreviatedToFullDayName(abbreviatedDay);
          const dayNumber = dayNameToNumber(fullDayName);
          const startTimeAmPm = convertTimeToAmPm(start);
          const endTimeAmPm = convertTimeToAmPm(end);

          if (editingItem) {
            // แก้ไขรายการเดิม
            setItems(
              items.map((item) =>
                item.id === editingItem.id
                  ? {
                    ...item,
                    day: dayNumber,
                    start: startTimeAmPm,
                    end: endTimeAmPm,
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
                start: startTimeAmPm,
                end: endTimeAmPm,
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