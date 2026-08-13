"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ChartNoAxesColumnIncreasing,
  RefreshCw,
} from "lucide-react";
import { ExamScoreSummariesResponse } from "@/interfaces/dashboard.interface";
import { dashboardService } from "@/services/dashboard.service";
import DashboardCard from "./DashboardCard";
import ExamScoresCard from "./ExamScoresCard";

export default function ExamScoresMetricCard() {
  const [data, setData] = useState<ExamScoreSummariesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await dashboardService.getExamScoreSummaries());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "ไม่สามารถโหลดคะแนนแยกตามข้อสอบได้",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    dashboardService
      .getExamScoreSummaries()
      .then((response) => {
        if (active) setData(response);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "ไม่สามารถโหลดคะแนนแยกตามข้อสอบได้",
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
        title="คะแนนแยกตามข้อสอบ"
        subtitle="ไม่สามารถโหลดข้อมูลได้"
        icon={ChartNoAxesColumnIncreasing}
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
      <ExamScoresCard
        scores={[]}
        emptyMessage="กำลังโหลดคะแนนแยกตามข้อสอบ..."
      />
    );
  }

  return (
    <ExamScoresCard
      scores={data.scores.map((score) => ({
        exam: `${score.subject_id} · ${score.exam_name}`,
        average: score.average_percentage,
        highest: score.highest_percentage,
        lowest: score.lowest_percentage,
        userCount: score.user_count,
      }))}
    />
  );
}
