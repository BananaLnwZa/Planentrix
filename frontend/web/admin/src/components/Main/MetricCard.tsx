import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  unit: string;
  description: string;
  trendLabel: string;
  trend: readonly number[];
  icon: LucideIcon;
  accent: "blue" | "coral";
}

const accentStyles = {
  blue: {
    icon: "bg-[#e7f6fb] text-[#4f99b4]",
    value: "text-[#327b98]",
    bar: "bg-[#78bdd6]",
    badge: "bg-[#edf8fb] text-[#4d8da5]",
  },
  coral: {
    icon: "bg-[#fff0eb] text-[#cf7f69]",
    value: "text-[#bd6f5a]",
    bar: "bg-[#e8a28e]",
    badge: "bg-[#fff3ef] text-[#b76d59]",
  },
};

export default function MetricCard({
  title,
  value,
  unit,
  description,
  trendLabel,
  trend,
  icon: Icon,
  accent,
}: MetricCardProps) {
  const styles = accentStyles[accent];
  const max = Math.max(...trend);

  return (
    <section className="rounded-[24px] border border-[#dcebf0] bg-white p-5 shadow-[0_14px_38px_rgba(72,112,130,0.08)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="max-w-[220px] text-sm font-medium leading-6 text-[#33454d]">
          {title}
        </h2>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
        >
          <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
        </span>
      </div>

      <div className="mt-5 flex items-end gap-2">
        <strong
          className={`text-4xl font-normal tracking-[-0.04em] ${styles.value}`}
        >
          {value}
        </strong>
        <span className="pb-1 text-sm text-[#75858c]">{unit}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#87949a]">{description}</p>

      <div className="mt-5 flex h-14 items-end gap-1.5" aria-hidden="true">
        {trend.map((point, index) => (
          <span
            key={`${point}-${index}`}
            className={`flex-1 rounded-t-md ${
              index === trend.length - 1 ? "opacity-100" : "opacity-60"
            } ${styles.bar}`}
            style={{ height: `${Math.max((point / max) * 100, 18)}%` }}
          />
        ))}
      </div>

      <p
        className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] ${styles.badge}`}
      >
        {trendLabel}
      </p>
    </section>
  );
}
