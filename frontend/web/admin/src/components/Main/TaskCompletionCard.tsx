import { ListChecks } from "lucide-react";
import DashboardCard from "./DashboardCard";
import DonutChart from "./DonutChart";

interface TaskStatusItem {
  label: string;
  value: number;
  percent: number;
  color: string;
}

interface TaskCompletionCardProps {
  distribution: readonly TaskStatusItem[];
}

export default function TaskCompletionCard({
  distribution,
}: TaskCompletionCardProps) {
  const completed = distribution[0]?.percent ?? 0;

  return (
    <DashboardCard
      title="สัดส่วนงานที่เสร็จและงานค้าง"
      subtitle="สถานะงานทั้งหมดในภาคเรียนปัจจุบัน"
      icon={ListChecks}
    >
      <DonutChart
        segments={distribution}
        centerValue={`${completed.toLocaleString("th-TH", {
          maximumFractionDigits: 1,
        })}%`}
        centerLabel="อัตราสำเร็จ"
      />
    </DashboardCard>
  );
}
