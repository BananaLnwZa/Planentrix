"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, BookOpenText, Clock3, RefreshCw } from "lucide-react";
import { StudyTimeOverviewResponse } from "@/interfaces/dashboard.interface";
import { dashboardService } from "@/services/dashboard.service";
import MetricCard from "./MetricCard";

const formatHours = (hours: number) =>
  hours.toLocaleString("th-TH", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const getComparisonLabel = (percent: number | null) => {
  if (percent === null) return "ยังไม่มีข้อมูลสัปดาห์ก่อนหน้าให้เปรียบเทียบ";
  if (percent === 0) return "เท่ากับสัปดาห์ก่อน";
  return `${percent > 0 ? "+" : ""}${percent.toLocaleString("th-TH", {
    maximumFractionDigits: 1,
  })}% จากสัปดาห์ก่อน`;
};

export default function StudyMetricCards() {
  const [data, setData] = useState<StudyTimeOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setData(await dashboardService.getStudyTimeOverview());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "ไม่สามารถโหลดสถิติการใช้งานได้",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    dashboardService
      .getStudyTimeOverview()
      .then((response) => {
        if (active) setData(response);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "ไม่สามารถโหลดสถิติการใช้งานได้",
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
      <>
        {["ค่าเฉลี่ยเวลาที่ใช้ต่อสัปดาห์ ในเทอมปัจจุบัน", "ค่าเฉลี่ยเวลาที่ผู้ใช้ทบทวนทั้งหมด"].map((title) => (
          <section key={title} className="rounded-[24px] border border-[#f0d8d2] bg-white p-5 shadow-[0_14px_38px_rgba(72,112,130,0.08)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-medium leading-6 text-[#33454d]">{title}</h2>
                <p className="mt-4 text-sm text-[#a95745]">{error}</p>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0ec] text-[#c66d57]">
                <AlertCircle size={20} aria-hidden="true" />
              </span>
            </div>
            <button
              type="button"
              onClick={() => void loadData()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#4c93ac] px-3.5 py-2 text-xs font-medium text-white transition hover:bg-[#3f8299]"
            >
              <RefreshCw size={14} aria-hidden="true" /> ลองอีกครั้ง
            </button>
          </section>
        ))}
      </>
    );
  }

  if (loading || !data) {
    return (
      <>
        <MetricCard
          title="ค่าเฉลี่ยเวลาที่ใช้ต่อสัปดาห์ ในเทอมปัจจุบัน"
          value="—"
          unit="ชม./สัปดาห์"
          description="กำลังคำนวณจากเวลาเรียนจริงของผู้ใช้..."
          trendLabel="กำลังโหลดข้อมูล"
          trend={[0, 0, 0, 0, 0, 0, 0]}
          icon={Clock3}
          accent="blue"
        />
        <MetricCard
          title="ค่าเฉลี่ยเวลาที่ผู้ใช้ทบทวนทั้งหมด"
          value="—"
          unit="ชม./สัปดาห์"
          description="กำลังคำนวณจาก session ทบทวนของผู้ใช้..."
          trendLabel="กำลังโหลดข้อมูล"
          trend={[0, 0, 0, 0, 0, 0, 0]}
          icon={BookOpenText}
          accent="coral"
        />
      </>
    );
  }

  const { summary, trend } = data;
  const userCount = summary.active_users.toLocaleString("th-TH");
  const totalHours = summary.total_term_hours.toLocaleString("th-TH", {
    maximumFractionDigits: 1,
  });
  const totalReviewHours = summary.total_review_term_hours.toLocaleString(
    "th-TH",
    { maximumFractionDigits: 1 },
  );

  return (
    <>
      <MetricCard
        title="ค่าเฉลี่ยเวลาที่ใช้ต่อสัปดาห์ ในเทอมปัจจุบัน"
        value={formatHours(summary.average_weekly_hours)}
        unit="ชม./สัปดาห์"
        description={`คำนวณจากผู้ใช้ที่มีเทอมปัจจุบัน ${userCount} คน · เวลาเรียนรวม ${totalHours} ชม.`}
        trendLabel={getComparisonLabel(summary.comparison_percent)}
        trend={trend.map((point) => point.average_hours)}
        icon={Clock3}
        accent="blue"
      />
      <MetricCard
        title="ค่าเฉลี่ยเวลาที่ผู้ใช้ทบทวนทั้งหมด"
        value={formatHours(summary.average_review_weekly_hours)}
        unit="ชม./สัปดาห์"
        description={`เฉพาะ session ประเภท review จากผู้ใช้ ${userCount} คน · รวม ${totalReviewHours} ชม.`}
        trendLabel={getComparisonLabel(summary.review_comparison_percent)}
        trend={trend.map((point) => point.average_review_hours)}
        icon={BookOpenText}
        accent="coral"
      />
    </>
  );
}
