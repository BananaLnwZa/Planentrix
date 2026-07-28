import { UsersRound } from "lucide-react";
import DashboardCard from "./DashboardCard";
import DonutChart from "./DonutChart";

interface DistributionItem {
  label: string;
  value: number;
  percent: number;
  color: string;
}

interface UserAccountsCardProps {
  distribution: readonly DistributionItem[];
}

export default function UserAccountsCard({
  distribution,
}: UserAccountsCardProps) {
  const total = distribution.reduce((sum, item) => sum + item.value, 0);

  return (
    <DashboardCard
      title="จำนวนบัญชีผู้ใช้"
      subtitle="แบ่งตามชั้นปีของผู้ใช้งานปัจจุบัน"
      icon={UsersRound}
    >
      <DonutChart
        segments={distribution}
        centerValue={total.toLocaleString("th-TH")}
        centerLabel="บัญชีทั้งหมด"
      />
    </DashboardCard>
  );
}
