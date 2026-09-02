"use client";

import { Check, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SelectValue = string | number;

export type CustomSelectOption<T extends SelectValue> = {
  value: T;
  label: string;
  disabled?: boolean;
  optionClassName?: string;
  activeClassName?: string;
  selectedClassName?: string;
};

type MenuPosition = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
  opensUp: boolean;
};

type CustomSelectProps<T extends SelectValue> = {
  id?: string;
  name?: string;
  value: T | "" | null | undefined;
  options: CustomSelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
  compact?: boolean;
  showCheck?: boolean;
  maxMenuHeight?: number;
};

export default function CustomSelect<T extends SelectValue>({
  id,
  name,
  value,
  options,
  onChange,
  placeholder = "เลือกข้อมูล",
  disabled = false,
  required = false,
  ariaLabel,
  ariaInvalid = false,
  className = "",
  buttonClassName = "",
  menuClassName = "",
  optionClassName = "",
  compact = false,
  showCheck = true,
  maxMenuHeight = 260,
}: CustomSelectProps<T>) {
  const generatedId = useId();
  const selectId = id ?? `custom-select-${generatedId.replaceAll(":", "")}`;
  const listboxId = `${selectId}-listbox`;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const enabledOptions = useMemo(
    () => options.filter((option) => !option.disabled),
    [options]
  );
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const desiredMenuHeight = Math.min(
        maxMenuHeight,
        options.length * (compact ? 36 : 44) + 2
      );
      const opensUp = below < desiredMenuHeight && above > below;
      setPosition({
        left: Math.max(12, Math.min(rect.left, window.innerWidth - rect.width - 12)),
        width: Math.min(rect.width, window.innerWidth - 24),
        ...(opensUp
          ? { bottom: window.innerHeight - rect.top }
          : { top: rect.bottom }),
        maxHeight: Math.max(
          96,
          Math.min(maxMenuHeight, opensUp ? above : below)
        ),
        opensUp,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [compact, maxMenuHeight, open, options.length]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex((current) =>
          enabledOptions.length
            ? (current + direction + enabledOptions.length) % enabledOptions.length
            : 0
        );
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        setActiveIndex(
          event.key === "Home" ? 0 : Math.max(0, enabledOptions.length - 1)
        );
      } else if (event.key === "Enter" && enabledOptions[activeIndex]) {
        event.preventDefault();
        onChange(enabledOptions[activeIndex].value);
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, enabledOptions, onChange, open]);

  const openMenu = () => {
    const selectedIndex = enabledOptions.findIndex(
      (option) => option.value === value
    );
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const toggle = () => {
    if (disabled) return;
    if (open) setOpen(false);
    else openMenu();
  };

  return (
    <div className={`relative min-w-0 ${className}`}>
      {name && <input type="hidden" name={name} value={value ?? ""} />}
      <button
        ref={buttonRef}
        id={selectId}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        data-invalid={ariaInvalid || undefined}
        data-required={required || undefined}
        onClick={toggle}
        onKeyDown={(event) => {
          if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
            event.preventDefault();
            openMenu();
          }
        }}
        className={`flex w-full items-center justify-between border bg-white text-left outline-none transition-all duration-200 focus-visible:border-[#B899D0] focus-visible:ring-2 focus-visible:ring-[#EEE2F5] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 ${
          compact ? "h-9 px-3 text-xs" : "h-12 px-4 text-sm"
        } ${ariaInvalid ? "border-red-400" : "border-gray-300"} ${
          open
            ? position?.opensUp
              ? "rounded-b-[22px] border-t-transparent"
              : "rounded-t-[22px] border-b-transparent"
            : "rounded-full"
        } ${buttonClassName}`}
      >
        <span className={`min-w-0 truncate ${selectedOption ? "text-gray-700" : "text-gray-400"}`}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`ml-2 shrink-0 text-[#C7A8D9] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          size={compact ? 18 : 22}
          strokeWidth={2.4}
        />
      </button>

      {open &&
        position &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="ปิดตัวเลือก"
              className="fixed inset-0 z-[2147483645] cursor-default"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={() => setOpen(false)}
            />
            <div
              id={listboxId}
              role="listbox"
              aria-labelledby={selectId}
              onMouseDown={(event) => event.stopPropagation()}
              className={`fixed z-[2147483646] overflow-y-auto border border-gray-300 bg-white shadow-xl ${
                position.opensUp
                  ? "rounded-t-[22px] border-b-0"
                  : "rounded-b-[22px] border-t-0"
              } ${menuClassName}`}
              style={{
                left: position.left,
                width: position.width,
                top: position.top,
                bottom: position.bottom,
                maxHeight: position.maxHeight,
              }}
            >
              {options.map((option, index) => {
                const selected = option.value === value;
                const enabledIndex = enabledOptions.findIndex(
                  (enabledOption) => enabledOption.value === option.value
                );
                const active = enabledIndex === activeIndex;
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={option.disabled}
                    onMouseEnter={() => {
                      if (enabledIndex >= 0) setActiveIndex(enabledIndex);
                    }}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                      buttonRef.current?.focus();
                    }}
                    className={`flex w-full items-center justify-center gap-2 border-0 bg-white px-3 text-center text-gray-700 transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-45 ${
                      compact ? "min-h-9 text-xs" : "min-h-11 text-sm"
                    } ${
                      option.activeClassName
                        ? ""
                        : "hover:!bg-[#EEE2F5] hover:!text-[#8E64A5]"
                    } ${index !== options.length - 1 ? "border-b border-gray-200" : ""} ${
                      active
                        ? option.activeClassName ??
                          "!bg-[#EEE2F5] !text-[#8E64A5]"
                        : ""
                    } ${selected ? "font-semibold" : ""} ${option.optionClassName ?? ""} ${
                      selected ? option.selectedClassName ?? "" : ""
                    } ${optionClassName}`}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    {showCheck && selected && <Check aria-hidden="true" size={15} />}
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
