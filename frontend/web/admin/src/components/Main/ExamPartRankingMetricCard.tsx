"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Award, RefreshCw } from "lucide-react";
import {
  ExamPartRankingItem,
  ExamPartRankingsResponse,
} from "@/interfaces/dashboard.interface";
import { dashboardService } from "@/services/dashboard.service";
import DashboardCard from "./DashboardCard";
import ExamPartRankingCard from "./ExamPartRankingCard";

const toCardItem = (item: ExamPartRankingItem) => ({
  label: `${item.exam_name} · Part ${item.part_order}: ${item.exam_part_name}`,
  score: Number(item.average_percentage.toFixed(1)),
  userCount: item.user_count,
});

export default function ExamPartRankingMetricCard() {
  const [data, setData] = useState<ExamPartRankingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await dashboardService.getExamPartRankings());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "ไม่สามารถโหลดอันดับ Part ข้อสอบได้",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    dashboardService
      .getExamPartRankings()
      .then((response) => {
        if (active) setData(response);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "ไม่สามารถโหลดอันดับ Part ข้อสอบได้",
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
        title="ลำดับ Part ข้อสอบ"
        subtitle="ไม่สามารถโหลดข้อมูลได้"
        icon={Award}
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
      <ExamPartRankingCard
        best={[]}
        weakest={[]}
        emptyMessage="กำลังโหลดอันดับ Part ข้อสอบ..."
      />
    );
  }

  return (
    <ExamPartRankingCard
      best={data.best.map(toCardItem)}
      weakest={data.weakest.map(toCardItem)}
    />
  );
}
