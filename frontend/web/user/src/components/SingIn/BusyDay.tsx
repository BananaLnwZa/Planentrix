"use client";

import { useState } from "react";
import BusyDayModal from "./BusyDayModal";
import { Pencil, Trash2 } from "lucide-react";

type Item = {
  id: string;
  day: string;
  start: string;
  end: string;
};

export default function FlatSchedule() {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [form, setForm] = useState({
    day: "Monday",
    start: "",
    end: "",
  });

  // ➕ save
  const saveItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        ...form,
      },
    ]);

    setForm({ day: "Monday", start: "", end: "" });
    setOpen(false);
  };

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
                {t.day}
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
        editItem={editingItem}
        onClose={() => {
          setOpen(false);
          setEditingItem(null);
        }}
        onConfirm={(day, start, end) => {
          if (editingItem) {
            // แก้ไขรายการเดิม
            setItems(
              items.map((item) =>
                item.id === editingItem.id
                  ? {
                      ...item,
                      day,
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
                day,
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
}