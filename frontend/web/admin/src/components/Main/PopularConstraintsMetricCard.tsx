"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw, SlidersHorizontal } from "lucide-react";
import {
  PopularConstraintApiItem,
  PopularConstraintsResponse,
} from "@/interfaces/dashboard.interface";
import { dashboardService } from "@/services/dashboard.service";
import DashboardCard from "./DashboardCard";
import PopularConstraintsCard from "./PopularConstraintsCard";

const dayNames: Record<number, string> = {
  1: "วันจันทร์",
  2: "วันอังคาร",
  3: "วันพุธ",
  4: "วันพฤหัสบดี",
  5: "วันศุกร์",
  6: "วันเสาร์",
  7: "วันอาทิตย์",
};

const formatMinutes = (value: number) => {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (hours > 0 && minutes > 0) return `${hours} ชม. ${minutes} นาที`;
  if (hours > 0) return `${hours} ชั่วโมง`;
  return `${minutes} นาที`;
};

const formatValue = (item: PopularConstraintApiItem) => {
  if (item.value === null) return "ยังไม่มีข้อมูล";

  switch (item.key) {
    case "day_off":
    case "recurring_busy_day":
      return dayNames[Number(item.value)] ?? "ไม่ทราบวัน";
    case "continuous_working_duration":
    case "break_duration":
      return formatMinutes(Number(item.value));
    case "preferred_time_range":
      return item.secondary_value
        ? `${String(item.value)}–${item.secondary_value}`
        : String(item.value);
  }
};

const labels = {
  day_off: "วันหยุดประจำสัปดาห์",
  continuous_working_duration: "ทำงานต่อเนื่องสูงสุด",
  break_duration: "เวลาพักระหว่างงาน",
  preferred_time_range: "ช่วงเวลาที่สะดวก",
  recurring_busy_day: "วันที่มักไม่ว่าง",
} as const;

export default function PopularConstraintsMetricCard() {
  const [data, setData] = useState<PopularConstraintsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await dashboardService.getPopularConstraints());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "ไม่สามารถโหลดสถิติข้อจำกัดได้",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    dashboardService
      .getPopularConstraints()
      .then((response) => {
        if (active) setData(response);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "ไม่สามารถโหลดสถิติข้อจำกัดได้",
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
        title="ข้อจำกัดตารางที่ได้รับความนิยม"
        subtitle="ไม่สามารถโหลดข้อมูลได้"
        icon={SlidersHorizontal}
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
      <PopularConstraintsCard
        items={Object.values(labels).map((label) => ({
          label,
          value: "กำลังโหลด...",
          percent: 0,
        }))}
      />
    );
  }

  return (
    <PopularConstraintsCard
      items={data.items.map((item) => ({
        label: labels[item.key],
        value: formatValue(item),
        percent: item.percent,
      }))}
    />
  );
}
