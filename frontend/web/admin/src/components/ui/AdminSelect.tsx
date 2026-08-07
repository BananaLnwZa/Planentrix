"use client";

import { KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";

export interface AdminSelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface AdminSelectProps {
  value: string;
  options: AdminSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  tone?: "blue" | "violet";
}

interface MenuPosition {
  left: number;
  top: number;
  width: number;
  openUp: boolean;
}

export default function AdminSelect({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = "เลือกรายการ",
  className = "",
  disabled = false,
  tone = "blue",
}: AdminSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const accent = tone === "violet" ? "#8174b8" : "#4c93ac";

  const updatePosition = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = Math.min(options.length * 52 + 16, 272);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + 12 && rect.top > spaceBelow;
    setPosition({
      left: rect.left,
      top: openUp
        ? Math.max(8, rect.top - menuHeight - 8)
        : Math.min(window.innerHeight - menuHeight - 8, rect.bottom + 8),
      width: rect.width,
      openUp,
    });
  }, [options.length]);

  const openMenu = () => {
    if (disabled) return;
    updatePosition();
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const selectOption = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleViewportChange = () => updatePosition();

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, updatePosition]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === "Escape") {
      if (open) event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) openMenu();
      else selectOption(activeIndex);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    event.preventDefault();
    if (!open) {
      openMenu();
      return;
    }
    const direction = event.key === "ArrowDown" ? 1 : -1;
    let nextIndex = activeIndex;
    for (let count = 0; count < options.length; count += 1) {
      nextIndex = (nextIndex + direction + options.length) % options.length;
      if (!options[nextIndex]?.disabled) break;
    }
    setActiveIndex(nextIndex);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
        className={`group flex h-11 w-full items-center gap-2.5 rounded-xl border bg-[#fbfdfe] pl-3.5 pr-2 text-left text-sm shadow-[0_2px_7px_rgba(55,88,102,0.04)] outline-none transition disabled:cursor-not-allowed disabled:opacity-55 ${
          open
            ? tone === "violet"
              ? "border-[#9b90c5] ring-4 ring-[#efecfa]"
              : "border-[#79bdd4] ring-4 ring-[#e1f4fa]"
            : "border-[#dbe6ea] hover:border-[#b9d5df] hover:bg-white"
        }`}
      >
        <span className={`min-w-0 flex-1 truncate ${selectedOption ? "text-[#405862]" : "text-[#94a2a8]"}`}>
          {selectedOption?.label ?? placeholder}
        </span>
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#edf4f6] text-[#6f8791] transition group-hover:bg-[#e3eff3]"
        >
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </span>
      </button>

      {open && position &&
        createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            className="fixed z-[200] overflow-y-auto rounded-2xl border border-white/90 bg-white/95 p-1.5 shadow-[0_18px_48px_rgba(36,65,77,0.22)] backdrop-blur-xl"
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
              maxHeight: 272,
              transformOrigin: position.openUp ? "bottom" : "top",
            }}
          >
            {options.map((option, index) => {
              const selected = option.value === value;
              const active = index === activeIndex;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={option.disabled}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectOption(index)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-45 ${
                    selected
                      ? tone === "violet"
                        ? "bg-[#f0eef9] text-[#665a98]"
                        : "bg-[#e9f6fa] text-[#39788f]"
                      : active
                        ? "bg-[#f2f7f9] text-[#405862]"
                        : "text-[#526871] hover:bg-[#f5f9fa]"
                  }`}
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
                      selected
                        ? "border-transparent text-white"
                        : "border-[#d8e3e7] bg-white text-transparent"
                    }`}
                    style={selected ? { backgroundColor: accent } : undefined}
                  >
                    <Check size={13} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{option.label}</span>
                    {option.description && (
                      <span className="mt-0.5 block truncate text-[11px] font-normal text-[#8a9aa1]">
                        {option.description}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
