"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ListChecks, RefreshCw } from "lucide-react";
import { WorkloadCompletionResponse } from "@/interfaces/dashboard.interface";
import { dashboardService } from "@/services/dashboard.service";
import DashboardCard from "./DashboardCard";
import TaskCompletionCard from "./TaskCompletionCard";

export default function TaskCompletionMetricCard() {
  const [data, setData] = useState<WorkloadCompletionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await dashboardService.getWorkloadCompletion());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "ไม่สามารถโหลดสัดส่วนสถานะงานได้",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    dashboardService
      .getWorkloadCompletion()
      .then((response) => {
        if (active) setData(response);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "ไม่สามารถโหลดสัดส่วนสถานะงานได้",
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
        title="สัดส่วนงานที่เสร็จและงานค้าง"
        subtitle="ไม่สามารถโหลดข้อมูลได้"
        icon={ListChecks}
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
        title="สัดส่วนงานที่เสร็จและงานค้าง"
        subtitle="สถานะงานทั้งหมดในภาคเรียนปัจจุบัน"
        icon={ListChecks}
      >
        <div className="flex min-h-40 items-center justify-center text-sm text-[#87979e]">
          กำลังโหลดสถานะงาน...
        </div>
      </DashboardCard>
    );
  }

  return (
    <TaskCompletionCard
      distribution={[
        {
          label: "งานเสร็จแล้ว",
          value: data.completed_count,
          percent: data.completed_percent,
          color: "#68b89d",
        },
        {
          label:
            data.overdue_count > 0
              ? `งานค้าง (เกินกำหนด ${data.overdue_count.toLocaleString("th-TH")})`
              : "งานค้าง",
          value: data.pending_count,
          percent: data.pending_percent,
          color: "#e89a86",
        },
      ]}
    />
  );
}
