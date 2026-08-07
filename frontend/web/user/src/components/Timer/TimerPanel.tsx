import {
  LoaderCircle,
  Pause,
  Play,
  Square,
  TimerReset,
} from "lucide-react";
import type {
  StudySession,
  StudyType,
  TimerSubject,
} from "@/interfaces/time.interface";
import { formatClock, studyTypeLabels } from "./timer.utils";

export type TimerPhase = "idle" | "running" | "paused" | "interrupted";

interface TimerPanelProps {
  subjects: TimerSubject[];
  studyTypes: StudyType[];
  selectedScheduleId: number | null;
  selectedStudyTypeId: number | null;
  activeSession: StudySession | null;
  phase: TimerPhase;
  elapsedSeconds: number;
  busy: boolean;
  online: boolean;
  onSubjectChange: (scheduleTimeId: number | null) => void;
  onStudyTypeChange: (studyTypeId: number | null) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
}

export default function TimerPanel({
  subjects,
  studyTypes,
  selectedScheduleId,
  selectedStudyTypeId,
  phase,
  elapsedSeconds,
  busy,
  online,
  onSubjectChange,
  onStudyTypeChange,
  onStart,
  onPause,
  onResume,
  onFinish,
}: TimerPanelProps) {
  const canStart =
    phase === "idle" &&
    selectedScheduleId !== null &&
    selectedStudyTypeId !== null &&
    !busy &&
    online;

  return (
    <section className="relative shrink-0 overflow-hidden rounded-[18px] border border-[#d8e2e7] bg-white px-3 pb-2 pt-2 shadow-[0_4px_10px_rgba(78,68,61,0.16)] sm:px-4">
      <div className="mb-2 flex items-center justify-between gap-3 border-b border-[#eee4df] pb-2">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-[#a77b8a] uppercase">
            Focus session
          </p>
          <h1 className="font-sans text-lg font-semibold leading-tight text-[#4e4350]">
            จับเวลาทบทวน
          </h1>
        </div>
        <div className="rounded-full bg-[#eaf6fc] p-2 text-[#79b6d8]">
          <TimerReset size={18} />
        </div>
      </div>

      <div className="mx-auto grid max-w-[390px] grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-2">
        <label className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-[#746b6e]">
          <span className="shrink-0">วิชา :</span>
          <select
            value={selectedScheduleId ?? ""}
            disabled={phase !== "idle" || busy || !online}
            onChange={(event) =>
              onSubjectChange(
                event.target.value ? Number(event.target.value) : null
              )
            }
            className="h-7 min-w-0 flex-1 rounded-full border border-[#e5dce0] bg-[#fffdfd] px-2 text-[11px] font-normal text-[#4c4548] outline-none transition focus:border-[#9acde8] focus:ring-2 focus:ring-[#e1f3fc] disabled:cursor-not-allowed disabled:bg-[#f5f1ef]"
          >
            <option value="">เลือกวิชา</option>
            {subjects.map((subject) => (
              <option
                key={subject.schedule_time_id}
                value={subject.schedule_time_id}
              >
                {subject.subject_name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-[#746b6e]">
          <span className="shrink-0">วิธีทบทวน :</span>
          <select
            value={selectedStudyTypeId ?? ""}
            disabled={phase !== "idle" || busy || !online}
            onChange={(event) =>
              onStudyTypeChange(
                event.target.value ? Number(event.target.value) : null
              )
            }
            className="h-7 min-w-0 flex-1 rounded-full border border-[#d4e4ec] bg-[#fbfdff] px-2 text-[11px] font-normal text-[#4c4548] outline-none transition focus:border-[#83bedf] focus:ring-2 focus:ring-[#e1f3fc] disabled:cursor-not-allowed disabled:bg-[#f5f1ef]"
          >
            <option value="">เลือกวิธีทบทวน</option>
            {studyTypes.map((type) => (
              <option key={type.study_type_id} value={type.study_type_id}>
                {studyTypeLabels[type.study_type_name] ?? type.study_type_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-2 text-center">
        <div className="font-mono text-[32px] font-light leading-none tracking-[0.08em] text-[#514a4d] tabular-nums sm:text-[35px]">
          {formatClock(elapsedSeconds)}
        </div>
        <div className="mx-auto mt-1 grid max-w-[218px] grid-cols-3 text-[9px] tracking-wide text-[#afa5a7]">
          <span>ชั่วโมง</span>
          <span>นาที</span>
          <span>วินาที</span>
        </div>
      </div>

      <div className="mt-2 flex min-h-9 items-center justify-center gap-3">
        {phase === "idle" && (
          <button
            type="button"
            disabled={!canStart}
            onClick={onStart}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#9fcf86] bg-[#d9f2ca] text-[#6da654] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#ccebb9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#83b96a] disabled:cursor-not-allowed disabled:border-[#d8d4d4] disabled:bg-[#e7e4e4] disabled:text-white disabled:hover:translate-y-0"
            aria-label="เริ่มจับเวลา"
            title="เริ่มจับเวลา"
          >
            {busy ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
          </button>
        )}

        {phase === "running" && (
          <button
            type="button"
            disabled={busy || !online}
            onClick={onPause}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#efca75] bg-[#ffe5a6] text-[#a97924] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#ffdc8a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ddb34f] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="หยุดชั่วคราว"
            title="หยุดชั่วคราว"
          >
            <Pause size={16} fill="currentColor" />
          </button>
        )}

        {phase === "paused" && (
          <button
            type="button"
            disabled={busy || !online}
            onClick={onResume}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#9fcf86] bg-[#d9f2ca] text-[#6da654] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#ccebb9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#83b96a] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="จับเวลาต่อ"
            title="จับเวลาต่อ"
          >
            <Play size={16} fill="currentColor" />
          </button>
        )}

        {(phase === "running" || phase === "paused") && (
          <button
            type="button"
            disabled={busy || !online}
            onClick={onFinish}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#efb0b8] bg-[#ffd7dc] text-[#b65d69] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#ffc8cf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#df8d99] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="เลิกจับเวลา"
            title="เลิกจับเวลา"
          >
            <Square size={15} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {!online && (
        <p className="mt-1 text-center text-[10px] font-semibold text-[#b26772]">
          ออฟไลน์อยู่ — เชื่อมต่ออินเทอร์เน็ตก่อนควบคุมเวลา
        </p>
      )}
      <p className="mt-1 text-center text-[9px] text-[#b0a3a7]">
        {phase === "idle" && (!selectedScheduleId || !selectedStudyTypeId)
          ? "เลือกวิชาและวิธีทบทวนก่อนเริ่ม · จำกัดเวลา 4 ชั่วโมง"
          : "ระบบจะหยุดอัตโนมัติเมื่อครบ 4 ชั่วโมง"}
      </p>
    </section>
  );
}
