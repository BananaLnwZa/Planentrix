"use client";

import { useState } from "react";

type Item = {
  id: string;
  day: string;
  start: string;
  end: string;
};

export default function FlatSchedule() {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);

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
        เวลาไม่ว่างทั้งหมด
      </h2>

      {/* LIST */}
      <div className="border border-gray-300 rounded-2xl p-5 space-y-2">

        {items.length === 0 && (
          <p className="text-sm text-gray-400">
            ยังไม่มีข้อมูล
          </p>
        )}

        {items.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between text-sm"
          >

            {/* 🔵 bullet + day */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-200"></span>

              <span className="w-24 text-gray-700">
                {t.day}
              </span>
            </div>

            {/* time */}
            <span className="text-gray-900">
              {t.start} - {t.end}
            </span>

          </div>
        ))}

      </div>

      {/* ADD BUTTON */}
      <button
        onClick={() => setOpen(true)}
        className="
          w-full
          border-dashed
          border
          rounded-full
          py-2
          text-sm
          text-black
          hover:bg-gray-100
          transition
        "
      >
        + เพิ่มเวลาไม่ว่าง
      </button>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-5 rounded-xl w-[300px] space-y-3">

            <h3 className="font-medium text-gray-700">
              เพิ่มเวลาไม่ว่าง
            </h3>

            {/* DAY */}
            <select
              value={form.day}
              onChange={(e) =>
                setForm({ ...form, day: e.target.value })
              }
              className="w-full border rounded-full px-3 py-2 text-gray-400"
            >
              <option>Monday</option>
              <option>Tuesday</option>
              <option>Wednesday</option>
              <option>Thursday</option>
              <option>Friday</option>
              <option>Saturday</option>
              <option>Sunday</option>
            </select>

            {/* START */}
            <input
              type="time"
              value={form.start}
              onChange={(e) =>
                setForm({ ...form, start: e.target.value })
              }
              className="w-full border rounded-full px-3 py-2 text-gray-400"
            />

            {/* END */}
            <input
              type="time"
              value={form.end}
              onChange={(e) =>
                setForm({ ...form, end: e.target.value })
              }
              className="w-full border rounded-full px-3 py-2 text-gray-400"
            />

            {/* BUTTONS */}
            <div className="flex gap-2">
              <button
                onClick={saveItem}
                className="flex-1 bg-blue-500 text-white rounded-full py-2"
              >
                บันทึก
              </button>

              <button
                onClick={() => setOpen(false)}
                className="flex-1 border rounded-full py-2"
              >
                ยกเลิก
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}