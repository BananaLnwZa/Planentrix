"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, BookOpenCheck, RefreshCw } from "lucide-react";
import { ReviewMethodsResponse } from "@/interfaces/dashboard.interface";
import { dashboardService } from "@/services/dashboard.service";
import DashboardCard from "./DashboardCard";
import ReviewMethodsCard from "./ReviewMethodsCard";

const methodNames: Record<string, string> = {
  reading: "อ่านและทบทวนเนื้อหา",
  practice: "ฝึกทำโจทย์",
  video: "ดูวิดีโอบทเรียน",
  review: "ทบทวนจุดที่ยังไม่แม่น",
};

const formatMinutes = (minutes: number) => {
  if (minutes >= 60) {
    return `${(minutes / 60).toLocaleString("th-TH", {
      maximumFractionDigits: 1,
    })} ชม.`;
  }
  return `${minutes.toLocaleString("th-TH", {
    maximumFractionDigits: 1,
  })} นาที`;
};

export default function ReviewMethodsMetricCard() {
  const [data, setData] = useState<ReviewMethodsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await dashboardService.getReviewMethods());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "ไม่สามารถโหลดวิธีทบทวนที่นิยมได้",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    dashboardService
      .getReviewMethods()
      .then((response) => {
        if (active) setData(response);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "ไม่สามารถโหลดวิธีทบทวนที่นิยมได้",
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
        title="วิธีทบทวนที่ได้รับความนิยม"
        subtitle="ไม่สามารถโหลดข้อมูลได้"
        icon={BookOpenCheck}
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
      <ReviewMethodsCard
        methods={[]}
        emptyMessage="กำลังโหลดวิธีทบทวน..."
      />
    );
  }

  return (
    <ReviewMethodsCard
      methods={data.methods.map((method) => ({
        label: methodNames[method.study_type_name] ?? method.study_type_name,
        percent: method.percent,
        detail: `${formatMinutes(method.total_minutes)} · ${method.user_count.toLocaleString("th-TH")} ผู้ใช้ · ${method.session_count.toLocaleString("th-TH")} ครั้ง`,
      }))}
    />
  );
}
