import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ActionIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export default function ActionIconButton({
  label,
  children,
  className = "",
  ...buttonProps
}: ActionIconButtonProps) {
  return (
    <span className="group relative inline-flex">
      <button
        {...buttonProps}
        type="button"
        title={label}
        className={`inline-flex size-9 items-center justify-center rounded-xl transition ${className}`}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#344b55] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
        <span className="absolute bottom-full left-1/2 size-0 -translate-x-1/2 border-x-4 border-b-4 border-x-transparent border-b-[#344b55]" />
      </span>
    </span>
  );
}
