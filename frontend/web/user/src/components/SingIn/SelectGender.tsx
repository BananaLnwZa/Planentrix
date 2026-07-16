"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

const genders = [
  {
    id: "male",
    label: "Male",
    base: "bg-white text-black",
    hover:
      "hover:border-[#BBDEF4] hover:text-[#BBDEF4]",
    active:
      "bg-white border-[#BBDEF4] text-[#BBDEF4]",
  },
  {
    id: "female",
    label: "Female",
    base: "bg-white text-black",
    hover:
      "hover:border-[#F8DCE4] hover:text-[#F8DCE4]",
    active:
      "bg-white border-[#F8DCE4] text-[#F8DCE4]",
  },
  {
    id: "other",
    label: "Other",
    base: "bg-white text-black",
    hover:
      "hover:border-[#E7CFF2] hover:text-[#E7CFF2]",
    active:
      "bg-white border-[#E7CFF2] text-[#E7CFF2]",
  },
];

interface SelectGenderProps {
  value?: "male" | "female" | "other" | null;
  onChange?: (gender: "male" | "female" | "other") => void;
  disabled?: boolean;
}

export default function SelectGender({ value, onChange, disabled = false }: SelectGenderProps) {
  const [selectedGender, setSelectedGender] = useState<string>(value || "");
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Update local state when value prop changes
    if (value !== undefined && value !== null) {
      setSelectedGender(value);
    }
  }, [value]);

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

  const handleToggle = () => {
    if (!disabled) {
      setOpen((previous) => !previous);
    }
  };

  const handleSelect = (gender: string) => {
    setSelectedGender(gender);
    if (onChange) {
      onChange(gender as "male" | "female" | "other");
    }
    setOpen(false);
  };

  return (
    <div
      className="
        w-full
        max-w-[180px]
        space-y-2

        sm:max-w-[210px]
        md:max-w-[240px]
      "
    >
      {/* Label */}
      <label
        className="
          block
          text-xs
          text-gray-700

          sm:text-sm
        "
      >
        gender
      </label>

      {/* Select */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`
          flex
          h-[42px]
          w-full
          items-center
          justify-between

          border
          border-gray-300
          bg-white

          px-3
          text-left
          outline-none
          disabled:bg-gray-100
          disabled:cursor-not-allowed

          transition-all
          duration-200

          sm:h-[45px]
          sm:px-4

          md:h-[48px]
          md:px-5

          ${
            open
              ? "rounded-t-[20px] border-b-transparent sm:rounded-t-[22px] md:rounded-t-[24px]"
              : "rounded-full"
          }
        `}
      >
        <span
          className={`
            min-w-0
            truncate
            text-xs

            sm:text-sm

            ${
              selectedGender
                ? "text-gray-700"
                : "text-gray-400"
            }
          `}
        >
          {selectedGender 
            ? genders.find(g => g.id === selectedGender)?.label || "select gender"
            : "select gender"}
        </span>

        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="#E7CFF2"
          className={`
            ml-2
            shrink-0
            transition-transform
            duration-200

            sm:h-7
            sm:w-7

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
            <button
              type="button"
              aria-label="Close gender dropdown"
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

                rounded-b-[20px]
                border
                border-t-0
                border-gray-300

                bg-white
                shadow-xl

                sm:rounded-b-[22px]
                md:rounded-b-[24px]
              "
              style={{
                top: rect.bottom,
                left: rect.left,
                width: rect.width,
                maxWidth: `calc(100vw - 24px)`,
              }}
            >
              {genders.map((gender, index) => {
                const selected =
                  selectedGender === gender.id;

                return (
                  <button
                    key={gender.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() =>
                      handleSelect(gender.id)
                    }
                    className={`
                      flex
                      h-[40px]
                      w-full
                      cursor-pointer
                      items-center
                      justify-center

                      border
                      border-transparent

                      text-xs
                      transition-all
                      duration-200

                      sm:h-[44px]
                      sm:text-sm

                      md:h-[48px]
                      md:text-base

                      ${gender.base}
                      ${gender.hover}

                      ${
                        selected
                          ? gender.active
                          : ""
                      }

                      ${
                        index !== genders.length - 1
                          ? "border-b-gray-200"
                          : ""
                      }
                    `}
                  >
                    {gender.label}
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