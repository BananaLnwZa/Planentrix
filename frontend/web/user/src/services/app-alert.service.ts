import type { AppAlert, AppAlertKind } from "@/interfaces/app-alert.interface";
import type { ExamCheckpointInsight } from "@/interfaces/exam.interface";
import type { HomeworkTask } from "@/interfaces/homework.interface";
import type { AcceptedWeeklySchedule } from "@/interfaces/recommendation.interface";
import type { CurrentScheduleResponse, ScheduleItem } from "@/interfaces/table.interface";

export const appAlertLeadTimeMs = 5 * 60 * 1000;

export const homeworkDeadlineVisibleFrom = (deadline: Date) =>
  new Date(
    deadline.getFullYear(),
    deadline.getMonth(),
    deadline.getDate() - 1
  );

type AlertSources = {
  homeworkTasks: HomeworkTask[];
  currentSchedule: CurrentScheduleResponse | null;
  weeklySchedule: AcceptedWeeklySchedule | null;
  checkpoints: ExamCheckpointInsight[];
};

const parseDateTime = (date: string, time: string) => {
  const parsed = new Date(`${date.slice(0, 10)}T${time.slice(0, 5)}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const localDateText = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const recurringOccurrence = (item: ScheduleItem, now: Date) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentDay = now.getDay() === 0 ? 7 : now.getDay();
  let dayOffset = (item.schedule_day - currentDay + 7) % 7;
  let date = new Date(today);
  date.setDate(date.getDate() + dayOffset);
  let start = parseDateTime(localDateText(date), item.start_time);
  let end = parseDateTime(localDateText(date), item.end_time);
  if (!start || !end) return null;
  if (dayOffset === 0 && end.getTime() <= now.getTime()) {
    dayOffset = 7;
    date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    start = parseDateTime(localDateText(date), item.start_time);
    end = parseDateTime(localDateText(date), item.end_time);
  }
  return start && end ? { start, end } : null;
};

const sessionAlert = ({
  id,
  kind,
  subjectName,
  start,
  end,
}: {
  id: string;
  kind: "class_session" | "review" | "homework_session";
  subjectName: string;
  start: Date;
  end: Date;
}): AppAlert => ({
  id,
  kind,
  subjectName,
  title:
    kind === "class_session"
      ? "ใกล้ถึงเวลาเรียน"
      : kind === "review"
        ? "ถึงเวลาทบทวน"
        : "ถึงเวลาทำการบ้าน",
  eventAt: start,
  visibleFrom: new Date(start.getTime() - appAlertLeadTimeMs),
  visibleUntil: end,
  destination: "/Main",
});

export const buildAppAlerts = (
  sources: AlertSources,
  now: Date = new Date()
): AppAlert[] => {
  const alerts: AppAlert[] = [];
  const accepted = sources.weeklySchedule?.accepted_recommendation;

  for (const item of sources.currentSchedule?.data ?? []) {
    if (item.schedule_type_id !== 1) continue;
    const occurrence = recurringOccurrence(item, now);
    if (!occurrence) continue;
    alerts.push(
      sessionAlert({
        id: `class:${item.schedule_time_id}:${localDateText(occurrence.start)}`,
        kind: "class_session",
        subjectName: item.subject_name,
        start: occurrence.start,
        end: occurrence.end,
      })
    );
  }

  if (accepted) {
    for (const block of sources.weeklySchedule?.weekly_blocks ?? []) {
      if (block.schedule_type_id !== 2 && block.schedule_type_id !== 3) continue;
      const start = parseDateTime(block.scheduled_date, block.start_time);
      const end = parseDateTime(block.scheduled_date, block.end_time);
      if (!start || !end || end.getTime() <= now.getTime()) continue;
      alerts.push(
        sessionAlert({
          id: `weekly:${block.weekly_block_id}`,
          kind: block.schedule_type_id === 2 ? "review" : "homework_session",
          subjectName: block.subject_name,
          start,
          end,
        })
      );
    }
  } else {
    for (const item of sources.currentSchedule?.data ?? []) {
      if (item.schedule_type_id !== 2 && item.schedule_type_id !== 3) continue;
      const occurrence = recurringOccurrence(item, now);
      if (!occurrence) continue;
      alerts.push(
        sessionAlert({
          id: `schedule:${item.schedule_time_id}:${localDateText(occurrence.start)}`,
          kind: item.schedule_type_id === 2 ? "review" : "homework_session",
          subjectName: item.subject_name,
          start: occurrence.start,
          end: occurrence.end,
        })
      );
    }
  }

  for (const checkpoint of sources.checkpoints) {
    alerts.push({
      id: `checkpoint:${checkpoint.examRepositoryId}`,
      kind: "checkpoint",
      subjectName: checkpoint.subjectName,
      title: checkpoint.examName || "ถึงรอบ Checkpoint",
      eventAt: checkpoint.nextCheckpointAt,
      visibleFrom: checkpoint.nextCheckpointAt,
      visibleUntil: null,
      destination: "/Test",
    });
  }

  for (const task of sources.homeworkTasks) {
    alerts.push({
      id: `deadline:${task.workload_id}`,
      kind: "homework_deadline",
      subjectName: task.subject_name,
      title: task.workload_name,
      eventAt: task.deadline,
      visibleFrom: homeworkDeadlineVisibleFrom(task.deadline),
      visibleUntil: null,
      destination: "/Score&Homework",
    });
  }

  return alerts;
};

export const activeAppAlerts = (alerts: AppAlert[], now: Date = new Date()) =>
  alerts
    .filter(
      (alert) =>
        alert.visibleFrom.getTime() <= now.getTime() &&
        (!alert.visibleUntil || alert.visibleUntil.getTime() > now.getTime())
    )
    .sort((left, right) => {
      const priority = (kind: AppAlertKind) => {
        if (kind === "homework_deadline") return 0;
        if (
          kind === "class_session" ||
          kind === "review" ||
          kind === "homework_session"
        ) {
          return 1;
        }
        return 2;
      };
      return (
        priority(left.kind) - priority(right.kind) ||
        left.eventAt.getTime() - right.eventAt.getTime()
      );
    });

export const appAlertKindLabel = (kind: AppAlertKind) => {
  switch (kind) {
    case "class_session":
      return "เข้าเรียน";
    case "review":
      return "ทบทวน";
    case "homework_session":
      return "ทำการบ้าน";
    case "checkpoint":
      return "Checkpoint";
    case "homework_deadline":
      return "กำหนดส่ง";
  }
};
