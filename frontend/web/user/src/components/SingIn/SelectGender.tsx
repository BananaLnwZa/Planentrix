"use client";
import { createPortal } from "react-dom";

import { useRef, useState } from "react";

export default function SelectGender() {
  const [selectedGender, setSelectedGender] = useState("");
  const [open, setOpen] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);

  const genders = ["Male", "Female", "Other"];

  const rect = buttonRef.current?.getBoundingClientRect();

  return (
    <div className="space-y-2 w-[210px]">
      {/* Label */}
      <label className="text-sm text-gray-700">
        gender
      </label>

      {/* Select */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="
          w-full
          h-[58px]
          px-5
          rounded-full
          border
          border-gray-300
          bg-white
          flex
          items-center
          justify-between
          text-left
        "
      >
        <span
          className={
            selectedGender
              ? "text-black"
              : "text-gray-400"
          }
        >
          {selectedGender || "select gender"}
        </span>

        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="#E7CFF2"
        >
          <path d="M7 10L12 15L17 10H7Z" />
        </svg>
      </button>

      {/* Popup */}
      {open &&
      rect &&
      createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setOpen(false)}
          />

          <div
            className="
              fixed
              bg-white
              rounded-[30px]
              border
              border-gray-300
              overflow-hidden
              shadow-xl
              z-[9999]
            "
            style={{
              top: rect.bottom + 8,
              left: rect.left,
              width: rect.width,
            }}
          >
            {genders.map((gender) => (
            <button
              key={gender}
              type="button"
              onClick={() => {
                setSelectedGender(gender);
                setOpen(false);
              }}
              className="
                w-full
                py-5
                text-center
                text-xl
                text-black
                transition-all
                duration-200
                cursor-pointer

                border-2
                border-transparent

                hover:text-[#D8B8E8]
                hover:border-[#E7CFF2]
                hover:bg-[#FCFAFD]
              "
            >
              {gender}
            </button>
          ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}