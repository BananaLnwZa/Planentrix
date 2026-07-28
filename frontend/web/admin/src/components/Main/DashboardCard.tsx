import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface DashboardCardProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}

export default function DashboardCard({
  title,
  subtitle,
  icon: Icon,
  children,
  className = "",
}: DashboardCardProps) {
  return (
    <section
      className={`rounded-[24px] border border-[#dcebf0] bg-white p-5 shadow-[0_14px_38px_rgba(72,112,130,0.08)] sm:p-6 ${className}`}
    >
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f7fc] text-[#4f98b3]">
          <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="text-base font-medium leading-6 text-[#293940]">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs leading-5 text-[#829097]">
              {subtitle}
            </p>
          )}
        </div>
      </header>

      <div className="mt-5">{children}</div>
    </section>
  );
}
