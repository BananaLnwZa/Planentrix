import { SlidersHorizontal } from "lucide-react";
import DashboardCard from "./DashboardCard";

interface ConstraintItem {
  label: string;
  value: string;
  percent: number;
}

interface PopularConstraintsCardProps {
  items: readonly ConstraintItem[];
}

export default function PopularConstraintsCard({
  items,
}: PopularConstraintsCardProps) {
  return (
    <DashboardCard
      title="ข้อจำกัดตารางที่ได้รับความนิยม"
      subtitle="ค่าที่ผู้ใช้เลือกมากที่สุดในแต่ละข้อจำกัด"
      icon={SlidersHorizontal}
    >
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-[#65767e]">{item.label}</span>
              <span className="shrink-0 font-medium text-[#354950]">
                {item.value}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#edf3f5]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#77bdd6] to-[#aad9e8]"
                style={{ width: `${item.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
