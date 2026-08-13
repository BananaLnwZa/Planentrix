import { BookOpenCheck } from "lucide-react";
import DashboardCard from "./DashboardCard";

interface ReviewMethod {
  label: string;
  percent: number;
  detail?: string;
}

interface ReviewMethodsCardProps {
  methods: readonly ReviewMethod[];
  emptyMessage?: string;
}

export default function ReviewMethodsCard({
  methods,
  emptyMessage = "ยังไม่มีข้อมูลวิธีทบทวนในเทอมปัจจุบัน",
}: ReviewMethodsCardProps) {
  return (
    <DashboardCard
      title="วิธีทบทวนที่ได้รับความนิยม"
      subtitle="สัดส่วนเวลาของแต่ละวิธีในเทอมปัจจุบัน"
      icon={BookOpenCheck}
    >
      <div className="space-y-5">
        {methods.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#d9e5e9] bg-[#f9fcfd] px-4 py-10 text-center text-sm text-[#87979e]">
            {emptyMessage}
          </div>
        )}
        {methods.map((method, index) => (
          <div key={method.label}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-sm text-[#53666e]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#eef7fa] text-[11px] text-[#4f91a9]">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate">{method.label}</span>
                  {method.detail && (
                    <span className="mt-0.5 block truncate text-[10px] text-[#94a2a8]">
                      {method.detail}
                    </span>
                  )}
                </span>
              </span>
              <span className="text-xs font-medium text-[#3f5b66]">
                {method.percent.toLocaleString("th-TH", {
                  maximumFractionDigits: 1,
                })}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#edf3f5]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#78bdd6] via-[#9ccfe0] to-[#e7b1a1]"
                style={{
                  width: `${Math.min(100, Math.max(0, method.percent))}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {methods.length > 0 && (
        <div className="mt-7 rounded-2xl bg-[#f7fbfc] px-4 py-3 text-xs leading-5 text-[#71828a]">
          วิธีที่ได้รับความนิยมสูงสุดคือ{" "}
          <strong className="font-medium text-[#3f6878]">
            {methods[0].label}
          </strong>
        </div>
      )}
    </DashboardCard>
  );
}
