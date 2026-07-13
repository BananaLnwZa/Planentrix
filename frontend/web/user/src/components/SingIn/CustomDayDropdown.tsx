"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  value: string;
  onChange: (day: string) => void;
};

const days = [
  {
    id: "Monday",
    label: "Monday",
    hover:
      "hover:border-[#F7E380] hover:text-[#D4B900]",
    active:
      "bg-[#FFFFF] border-[#F7E380] text-[#D4B900]",
  },
  {
    id: "Tuesday",
    label: "Tuesday",
    hover:
      "hover:border-[#F5B5CB] hover:text-[#E88BAD]",
    active:
      "bg-[#FFFFF] border-[#F5B5CB] text-[#E88BAD]",
  },
  {
    id: "Wednesday",
    label: "Wednesday",
    hover:
      "hover:border-[#B5E48C] hover:text-[#7EBD52]",
    active:
      "bg-[#FFFFF] border-[#B5E48C] text-[#7EBD52]",
  },
  {
    id: "Thursday",
    label: "Thursday",
    hover:
      "hover:border-[#FBC49C] hover:text-[#EB9558]",
    active:
      "bg-[#FFFFF] border-[#FBC49C] text-[#EB9558]",
  },
  {
    id: "Friday",
    label: "Friday",
    hover:
      "hover:border-[#D8B8E8] hover:text-[#D8B8E8]",
    active:
      "bg-[#FFFFF] border-[#D8B8E8] text-[#D8B8E8]",
  },
  {
    id: "Saturday",
    label: "Saturday",
    hover:
      "hover:border-[#71B7E4] hover:text-[#71B7E4]",
    active:
      "bg-[#FFFFF] border-[#71B7E4] text-[#71B7E4]",
  },
  {
    id: "Sunday",
    label: "Sunday",
    hover:
      "hover:border-[#FB9A92] hover:text-[#EC6E65]",
    active:
      "bg-[#FFFFF] border-[#FB9A92] text-[#EC6E65]",
  },
];

export default function CustomDayDropdown({
  value,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const updatePosition = () => {
      setRect(
        buttonRef.current?.getBoundingClientRect() ?? null
      );
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener(
      "scroll",
      updatePosition,
      true
    );

    return () => {
      window.removeEventListener(
        "resize",
        updatePosition
      );

      window.removeEventListener(
        "scroll",
        updatePosition,
        true
      );
    };
  }, [open]);

  return (
    <div className="w-full max-w-[240px]">
      {/* ช่อง Dropdown */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() =>
          setOpen((previous) => !previous)
        }
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`
          flex
          h-[48px]
          w-full
          items-center
          justify-between

          border
          border-gray-300
          bg-white
          px-4
          text-left
          outline-none

          transition-all
          duration-200

          ${
            open
              ? "rounded-t-[24px] border-b-transparent"
              : "rounded-full"
          }
        `}
      >
        <span
          className={
            value
              ? "text-sm text-gray-400"
              : "text-sm text-gray-400"
          }
        >
          {value || "เลือกวันที่ต้องการหยุด"}
        </span>

        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="#E7CFF2"
          className={`
            shrink-0
            transition-transform
            duration-200

            ${open ? "rotate-180" : ""}
          `}
        >
          <path d="M7 10L12 15L17 10H7Z" />
        </svg>
      </button>

      {/* Popup */}
      {open &&
        rect &&
        createPortal(
          <>
            {/* กดพื้นที่ด้านนอกเพื่อปิด */}
            <button
              type="button"
              aria-label="ปิด dropdown"
              className="
                fixed
                inset-0
                z-[9998]
                cursor-default
              "
              onClick={() => setOpen(false)}
            />

            <div
              role="listbox"
              className="
                fixed
                z-[9999]
                overflow-hidden

                rounded-b-[24px]

                border
                border-t-0
                border-gray-300

                bg-white
                shadow-xl
              "
              style={{
                top: rect.bottom,
                left: rect.left,
                width: rect.width,
              }}
            >
              {days.map((day, index) => {
                const selected = value === day.id;

                return (
                  <button
                    key={day.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(day.id);
                      setOpen(false);
                    }}
                    className={`
                      flex
                      h-[44px]
                      w-full
                      cursor-pointer
                      items-center
                      justify-center

                      border
                      border-transparent

                      bg-white
                      text-sm
                      text-gray-700

                      transition-all
                      duration-200

                      ${day.hover}

                      ${
                        selected
                          ? day.active
                          : ""
                      }

                      ${
                        index !== days.length - 1
                          ? "border-b-gray-200"
                          : ""
                      }
                    `}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}