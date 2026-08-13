"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw, UsersRound } from "lucide-react";
import { UserYearDistributionResponse } from "@/interfaces/dashboard.interface";
import { dashboardService } from "@/services/dashboard.service";
import DashboardCard from "./DashboardCard";
import UserAccountsCard from "./UserAccountsCard";

const yearColors: Record<number, string> = {
  1: "#78bdd6",
  2: "#9ccfe0",
  3: "#e8a28e",
  4: "#f1c9bc",
};

export default function UserAccountsMetricCard() {
  const [data, setData] = useState<UserYearDistributionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await dashboardService.getUserYearDistribution());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "ไม่สามารถโหลดจำนวนบัญชีตามชั้นปีได้",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    dashboardService
      .getUserYearDistribution()
      .then((response) => {
        if (active) setData(response);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "ไม่สามารถโหลดจำนวนบัญชีตามชั้นปีได้",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <DashboardCard
        title="จำนวนบัญชีผู้ใช้"
        subtitle="ไม่สามารถโหลดข้อมูลได้"
        icon={UsersRound}
      >
        <div className="rounded-xl bg-[#fff0ec] p-3 text-sm text-[#a95745]">
          <p className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 shrink-0" size={16} /> {error}
          </p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#4c93ac] px-3 py-2 text-xs font-medium text-white"
          >
            <RefreshCw size={13} /> ลองอีกครั้ง
          </button>
        </div>
      </DashboardCard>
    );
  }

  if (loading || !data) {
    return (
      <DashboardCard
        title="จำนวนบัญชีผู้ใช้"
        subtitle="แบ่งตามชั้นปีของผู้ใช้งานปัจจุบัน"
        icon={UsersRound}
      >
        <div className="flex min-h-40 items-center justify-center text-sm text-[#87979e]">
          กำลังโหลดข้อมูลบัญชี...
        </div>
      </DashboardCard>
    );
  }

  return (
    <UserAccountsCard
      distribution={data.distribution.map((item) => ({
        label:
          item.academic_year === null
            ? "ยังไม่มีเทอมปัจจุบัน"
            : `ชั้นปี ${item.academic_year}`,
        value: item.user_count,
        percent: item.percent,
        color:
          item.academic_year === null
            ? "#b9c5ca"
            : yearColors[item.academic_year],
      }))}
    />
  );
}
