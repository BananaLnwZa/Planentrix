"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  RefreshCw,
  XCircle,
} from "lucide-react";
import type {
  WeeklyRecommendation,
  WeeklyRecommendationItem,
} from "@/interfaces/recommendation.interface";
import recommendationService from "@/services/recommendation.service";
import { formatDisplayDate } from "@/utils/dateTime";
import RecommendationPreviewModal from "./RecommendationPreviewModal";

type RecommendationCardProps = {
  refreshKey: number;
  onAccepted: () => void;
};

const actionLabel: Record<string, string> = {
  create: "สร้างบล็อกใหม่",
  increase: "เพิ่มเวลา",
  decrease: "ลดเวลา",
  move: "ย้ายเวลา",
  remove: "นำออก",
  keep: "คงเวลาเดิม",
};

const triggerLabel: Record<string, string> = {
  weekend: "คำแนะนำประจำสัปดาห์",
  exam_submitted: "ปรับใหม่หลังทำแบบทดสอบ",
  workload_changed: "ปรับใหม่ตามภาระงาน",
  constraint_changed: "ปรับใหม่ตามข้อกำหนดเวลา",
  manual: "คำแนะนำล่าสุด",
};

const currentBangkokWeekStart = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const date = new Date(`${values.year}-${values.month}-${values.day}T00:00:00Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
};

const formatMinutes = (minutes: number) => {
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const remainder = absolute % 60;
  if (hours && remainder) return `${hours} ชม. ${remainder} นาที`;
  if (hours) return `${hours} ชม.`;
  return `${remainder} นาที`;
};

const thaiWeekdays = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];

const formatScheduleDay = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : thaiWeekdays[date.getUTCDay()];
};

const blockSummary = (value?: Record<string, unknown>) => {
  if (!value) return "";
  const date = formatScheduleDay(
    String(value.scheduled_date ?? value.scheduledDate ?? ""),
  );
  const start = String(value.start_time ?? value.startTime ?? "").slice(0, 5);
  const end = String(value.end_time ?? value.endTime ?? "").slice(0, 5);
  return [date, start && end ? `${start}–${end}` : start || end]
    .filter(Boolean)
    .join(" ");
};

const changeSummary = (change: WeeklyRecommendationItem["changes_json"][number]) => {
  const from = blockSummary(change.from);
  const to = blockSummary(change.to);
  switch (change.action) {
    case "create":
      return `สร้างบล็อกใหม่ ${to}`.trim();
    case "remove":
      return `นำบล็อก ${from} ออกจากสัปดาห์นี้`.trim();
    case "move":
      return `ย้ายจาก ${from} ไป ${to}`.trim();
    case "resize":
      return `ปรับระยะเวลาจาก ${from} เป็น ${to}`.trim();
    case "user_added":
      return "เพิ่มบล็อกโดยผู้ใช้";
    case "user_adjusted":
      return "ปรับตารางโดยผู้ใช้";
    default:
      return actionLabel[change.action] ?? change.action;
  }
};

function RecommendationItemRow({ item }: { item: WeeklyRecommendationItem }) {
  const delta = item.difference_minutes;
  return (
    <article className="rounded-xl border border-[#E2E7E9] bg-white/90 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-[#405B69]">
            {item.subject_name}
          </h4>
          <p className="mt-0.5 text-[10px] text-[#84939A]">
            {actionLabel[item.primary_action] ?? item.primary_action}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            delta > 0
              ? "bg-[#E5F4E2] text-[#56825C]"
              : delta < 0
                ? "bg-[#FFE7EB] text-[#B45B72]"
                : "bg-[#EDF2F4] text-[#70828A]"
          }`}
        >
          {delta > 0
            ? `+${formatMinutes(delta)}`
            : delta < 0
              ? `-${formatMinutes(delta)}`
              : "คงเดิม"}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-[#F6F9FA] px-2 py-2 text-center">
        <MinuteStat label="ปัจจุบัน" value={item.current_minutes} />
        <MinuteStat label="เป้าหมาย" value={item.target_minutes} />
        <MinuteStat label="จัดให้แล้ว" value={item.allocated_minutes} />
      </div>

      {item.reasons_json.length > 0 && (
        <ul className="mt-2 space-y-1 text-[10px] leading-4 text-[#6D7F87]">
          {item.reasons_json.slice(0, 3).map((reason, index) => (
            <li key={`${reason.code}-${index}`} className="flex gap-1.5">
              <ChevronRight size={11} className="mt-0.5 shrink-0 text-[#82A9B8]" />
              <span>{reason.message}</span>
            </li>
          ))}
        </ul>
      )}

      {item.changes_json.length > 0 && (
        <div className="mt-2 rounded-lg border border-[#E5ECEF] bg-[#FBFDFD] px-2.5 py-2">
          <p className="text-[9px] font-semibold text-[#78909C]">การเปลี่ยนแปลง</p>
          <ul className="mt-1 space-y-1 text-[10px] leading-4 text-[#627780]">
            {item.changes_json.slice(0, 3).map((change, index) => (
              <li key={`${change.action}-${index}`}>• {changeSummary(change)}</li>
            ))}
          </ul>
        </div>
      )}

      {(item.cap_applied || item.capacity_limited) && (
        <div className="mt-2 space-y-1 text-[10px] text-[#9A7129]">
          {item.cap_applied && <p>เวลาเป้าหมายถูกจำกัดตามเพดานรายวิชา</p>}
          {item.capacity_limited && (
            <p>ยังจัดไม่ได้ {formatMinutes(item.unallocated_minutes)} เพราะเวลาว่างไม่พอ</p>
          )}
        </div>
      )}
    </article>
  );
}

function MinuteStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span className="block text-[9px] text-[#91A0A7]">{label}</span>
      <strong className="mt-0.5 block text-[11px] font-semibold text-[#536A74]">
        {formatMinutes(value)}
      </strong>
    </div>
  );
}

export default function RecommendationCard({
  refreshKey,
  onAccepted,
}: RecommendationCardProps) {
  const [recommendation, setRecommendation] =
    useState<WeeklyRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    recommendationService
      .getLatest()
      .then((value) => {
        if (active) setRecommendation(value);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "ไม่สามารถโหลดคำแนะนำได้"
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const reviewItems = useMemo(
    () => recommendation?.items.filter((item) => item.schedule_type_id === 2) ?? [],
    [recommendation]
  );
  const homeworkItems = useMemo(
    () => recommendation?.items.filter((item) => item.schedule_type_id === 3) ?? [],
    [recommendation]
  );
  const weekLabel =
    recommendation?.week_start === currentBangkokWeekStart()
      ? "สัปดาห์นี้"
      : "สัปดาห์ถัดไป";

  const handleReject = async () => {
    if (!recommendation) return;
    setIsRejecting(true);
    setError("");
    try {
      setRecommendation(
        await recommendationService.reject(recommendation.recommendation_id)
      );
    } catch (rejectError) {
      setError(
        rejectError instanceof Error
          ? rejectError.message
          : "ไม่สามารถปฏิเสธคำแนะนำได้"
      );
    } finally {
      setIsRejecting(false);
    }
  };

  const handleAccept = async () => {
    if (!recommendation) return;
    setIsAccepting(true);
    setError("");
    try {
      setRecommendation(
        await recommendationService.accept(recommendation.recommendation_id)
      );
      onAccepted();
    } catch (acceptError) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : "ไม่สามารถยอมรับคำแนะนำได้"
      );
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <section
      className="flex min-h-0 w-full max-w-[390px] flex-1 flex-col overflow-hidden rounded-[22px] border border-[#D7C7CD] bg-[#FFFDF4] shadow-[0_7px_14px_rgba(72,82,86,0.18)]"
      style={{ fontFamily: "var(--font-sansation)" }}
    >
      <header className="border-b border-[#EADDE1] bg-gradient-to-r from-[#FCE4EC] to-[#E5F4FB] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#405B69]">
              <Clock3 size={17} className="text-[#6B9FB2]" />
              แนะนำจัดเวลา{weekLabel}
            </h2>
            {recommendation && (
              <p className="mt-1 text-[10px] text-[#758991]">
                {triggerLabel[recommendation.trigger_type]} ·{" "}
                {formatDisplayDate(recommendation.week_start)} –{" "}
                {formatDisplayDate(recommendation.week_end)}
              </p>
            )}
          </div>
          {recommendation?.status === "accepted" && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#E4F3E5] px-2 py-1 text-[10px] font-semibold text-[#5A8060]">
              <CheckCircle2 size={12} /> ใช้งานแล้ว
            </span>
          )}
        </div>
      </header>

      <div className="min-h-0 max-h-[430px] flex-1 overflow-y-auto px-3 py-3 [scrollbar-gutter:stable]">
        {isLoading ? (
          <div className="flex min-h-32 items-center justify-center gap-2 text-xs text-[#78909C]">
            <RefreshCw size={14} className="animate-spin" /> กำลังโหลดคำแนะนำ...
          </div>
        ) : error && !recommendation ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        ) : !recommendation || recommendation.status === "rejected" ? (
          <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-[#CBD9DE] bg-white/70 px-4 text-center">
            <CalendarRange size={22} className="text-[#91AEB9]" />
            <p className="mt-2 text-xs text-[#6E8189]">
              ยังไม่มีคำแนะนำที่รอใช้งานสำหรับสัปดาห์ถัดไป
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <RecommendationGroup title="เวลาทบทวน" items={reviewItems} />
            <RecommendationGroup title="เวลาทำการบ้าน" items={homeworkItems} />
            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            )}
          </div>
        )}
      </div>

      {recommendation && recommendation.status !== "rejected" && (
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[#EADDE1] bg-white/80 px-3 py-3">
          {recommendation.status === "pending" && (
            <button
              type="button"
              onClick={() => void handleReject()}
              disabled={isRejecting || isAccepting}
              className="inline-flex items-center gap-1 rounded-xl border border-[#E8C6CE] px-3 py-2 text-xs text-[#B05D70] hover:bg-[#FFF2F5] disabled:opacity-50"
            >
              <XCircle size={14} />
              {isRejecting ? "กำลังบันทึก..." : "ยังไม่ใช้ตอนนี้"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#6EA6BA] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#5C95A9]"
          >
            <Eye size={14} /> ดูตัวอย่างตาราง
          </button>
          {recommendation.status === "pending" && (
            <button
              type="button"
              onClick={() => void handleAccept()}
              disabled={isAccepting || isRejecting}
              className="rounded-xl bg-[#71A982] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#609A72] disabled:opacity-50"
            >
              {isAccepting ? "กำลังยอมรับ..." : "ยอมรับคำแนะนำ"}
            </button>
          )}
        </footer>
      )}

      {recommendation && isPreviewOpen && (
        <RecommendationPreviewModal
          recommendation={recommendation}
          onClose={() => setIsPreviewOpen(false)}
          onRecommendationChange={setRecommendation}
          onAccepted={(accepted) => {
            setRecommendation(accepted);
            setIsPreviewOpen(false);
            onAccepted();
          }}
        />
      )}
    </section>
  );
}

function RecommendationGroup({
  title,
  items,
}: {
  title: string;
  items: WeeklyRecommendationItem[];
}) {
  return (
    <section>
      <h3 className="mb-2 px-1 text-xs font-semibold text-[#6B7F88]">{title}</h3>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <RecommendationItemRow
              key={item.recommendation_item_id}
              item={item}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-xl bg-white/70 px-3 py-2 text-[11px] text-[#8A989E]">
          ไม่มีการเปลี่ยนแปลงในหมวดนี้
        </p>
      )}
    </section>
  );
}
