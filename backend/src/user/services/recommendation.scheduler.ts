import {
  addDays,
  bangkokDateTimeParts,
  compareDemandFairness,
  derivePrimaryAction,
  durationMinutes,
  isoDay,
  minutesToTime,
  MIN_BLOCK_MINUTES,
  timeToMinutes,
} from "./recommendation.rules";
import type {
  BaseBlockRow,
  BusyRow,
  CandidateSlot,
  ClassBlockRow,
  ConstraintRow,
  PlannedBlock,
  RecommendationItemDraft,
} from "./recommendation.types";

interface SchedulePlanInput {
  items: RecommendationItemDraft[];
  baseBlocks: BaseBlockRow[];
  classBlocks: ClassBlockRow[];
  busyBlocks: BusyRow[];
  constraint: ConstraintRow | null;
  weekStart: string;
  weekEnd: string;
  userId: number;
  termId: number;
  now: Date;
  previousAcceptedRecommendationId: number | null;
}

interface DemandSegment {
  id: string;
  item: RecommendationItemDraft;
  kind: "quiz" | "exam" | "weak" | "score" | "base" | "workload";
  priority: number;
  targetMinutes: number;
  allocatedMinutes: number;
  deadline: string | null;
}

interface AssignedSlot extends CandidateSlot {
  item: RecommendationItemDraft;
}

type Interval = { start: number; end: number };

const overlaps = (left: Interval, right: Interval) =>
  left.start < right.end && left.end > right.start;

const mergeIntervals = (intervals: Interval[]) => {
  const sorted = [...intervals].sort((left, right) => left.start - right.start);
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || previous.end < interval.start) {
      merged.push({ ...interval });
    } else {
      previous.end = Math.max(previous.end, interval.end);
    }
  }
  return merged;
};

const dateTimeKey = (date: string, time: string) => `${date}T${time}`;

const currentBangkokDateTimeKey = (now: Date) => {
  const parts = bangkokDateTimeParts(now);
  return `${parts.date}T${String(parts.hour).padStart(2, "0")}:${String(
    parts.minute
  ).padStart(2, "0")}:00`;
};

const isPastBlock = (block: BaseBlockRow, now: Date) =>
  dateTimeKey(block.scheduled_date, block.end_time) <= currentBangkokDateTimeKey(now);

const constraintValue = (value: number | null | undefined, fallback: number) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
};

const maximumSessionMinutes = (constraint: ConstraintRow | null) =>
  Math.max(
    MIN_BLOCK_MINUTES,
    constraintValue(constraint?.continuous_working_duration, 120),
  );

const buildCandidateSlots = (
  input: SchedulePlanInput,
  immutableBlocks: BaseBlockRow[]
) => {
  const workStart = input.constraint?.start_time
    ? timeToMinutes(input.constraint.start_time)
    : 8 * 60;
  const workEnd = input.constraint?.end_time
    ? timeToMinutes(input.constraint.end_time)
    : 22 * 60;
  const continuousMinutes = Math.max(
    MIN_BLOCK_MINUTES,
    constraintValue(input.constraint?.continuous_working_duration, 120)
  );
  const breakMinutes = constraintValue(input.constraint?.break_minutes, 30);
  const dayOff = Number(input.constraint?.day_off ?? 0);
  const slots: CandidateSlot[] = [];

  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(input.weekStart, offset);
    const day = isoDay(date);
    if (dayOff === day) continue;

    const hardBlocks: Interval[] = [];
    for (const classBlock of input.classBlocks.filter(
      (block) => Number(block.schedule_day) === day
    )) {
      hardBlocks.push({
        start: timeToMinutes(classBlock.start_time),
        end: timeToMinutes(classBlock.end_time),
      });
    }
    for (const busy of input.busyBlocks.filter(
      (block) => Number(block.recurring_busy_day) === day
    )) {
      hardBlocks.push({
        start: timeToMinutes(busy.start_time),
        end: timeToMinutes(busy.end_time),
      });
    }
    for (const block of immutableBlocks.filter(
      (item) => item.scheduled_date === date
    )) {
      hardBlocks.push({
        start: timeToMinutes(block.start_time),
        end: timeToMinutes(block.end_time),
      });
    }

    const blocked = mergeIntervals(hardBlocks).filter(
      (block) => block.end > workStart && block.start < workEnd
    );
    const gaps: Interval[] = [];
    let cursor = workStart;
    for (const block of blocked) {
      const start = Math.max(workStart, block.start);
      const end = Math.min(workEnd, block.end);
      if (cursor < start) gaps.push({ start: cursor, end: start });
      cursor = Math.max(cursor, end);
    }
    if (cursor < workEnd) gaps.push({ start: cursor, end: workEnd });

    for (const gap of gaps) {
      let windowStart = Math.ceil(gap.start / MIN_BLOCK_MINUTES) * MIN_BLOCK_MINUTES;
      while (windowStart + MIN_BLOCK_MINUTES <= gap.end) {
        const windowEnd = Math.min(gap.end, windowStart + continuousMinutes);
        for (
          let start = windowStart;
          start + MIN_BLOCK_MINUTES <= windowEnd;
          start += MIN_BLOCK_MINUTES
        ) {
          const slot = {
            date,
            day,
            startMinute: start,
            endMinute: start + MIN_BLOCK_MINUTES,
            key: `${date}:${start}`,
          };
          if (
            dateTimeKey(date, minutesToTime(slot.endMinute)) >
            currentBangkokDateTimeKey(input.now)
          ) {
            slots.push(slot);
          }
        }
        if (windowEnd >= gap.end) break;
        windowStart =
          Math.ceil((windowEnd + breakMinutes) / MIN_BLOCK_MINUTES) *
          MIN_BLOCK_MINUTES;
      }
    }
  }
  return slots;
};

const buildSegments = (item: RecommendationItemDraft): DemandSegment[] => {
  let remaining = item.targetMinutes;
  const segments: DemandSegment[] = [];
  const push = (
    kind: DemandSegment["kind"],
    minutes: number,
    priority: number,
    deadline: string | null,
    suffix: string
  ) => {
    const amount = Math.min(remaining, Math.max(0, minutes));
    if (amount <= 0) return;
    segments.push({
      id: `${item.key}:${suffix}`,
      item,
      kind,
      priority,
      targetMinutes: amount,
      allocatedMinutes: 0,
      deadline,
    });
    remaining -= amount;
  };

  if (item.scheduleTypeId === 3) {
    for (const demand of [...item.workloadDemands].sort(
      (left, right) =>
        left.priority - right.priority ||
        `${left.deadlineDate}T${left.deadlineTime}`.localeCompare(
          `${right.deadlineDate}T${right.deadlineTime}`
        ) ||
        left.workloadId - right.workloadId
    )) {
      push(
        "workload",
        demand.minutes,
        demand.priority,
        `${demand.deadlineDate}T${demand.deadlineTime}`,
        `workload-${demand.workloadId}`
      );
    }
  } else {
    if (item.quizFloorMinutes > 0) {
      push("quiz", 60, item.placementPriority, item.placementDeadline, "quiz");
    }
    push("exam", item.examProximityMinutes, 6, item.placementDeadline, "exam");
    push("weak", item.weakTopicMinutes, 7, item.placementDeadline, "weak");
    push("score", item.scoreGapMinutes, 8, item.placementDeadline, "score");
    push("base", item.baseMinutes, 9, item.placementDeadline, "base");
  }
  if (remaining > 0) {
    push("base", remaining, 9, item.placementDeadline, "remainder");
  }
  return segments;
};

const slotBeforeDeadline = (slot: CandidateSlot, deadline: string | null) => {
  if (!deadline) return true;
  return `${slot.date}T${minutesToTime(slot.endMinute)}` <= deadline;
};

const chooseSlot = (
  segment: DemandSegment,
  available: CandidateSlot[],
  preferredKeys: Set<string>,
  assigned: AssignedSlot[]
) => {
  const valid = available.filter((slot) => slotBeforeDeadline(slot, segment.deadline));
  if (valid.length === 0) return null;

  const assignedPerDay = new Map<string, number>();
  for (const slot of assigned.filter((entry) => entry.item.key === segment.item.key)) {
    assignedPerDay.set(slot.date, (assignedPerDay.get(slot.date) ?? 0) + 1);
  }
  valid.sort((left, right) => {
    const leftPreferred = preferredKeys.has(left.key) ? 0 : 1;
    const rightPreferred = preferredKeys.has(right.key) ? 0 : 1;
    if (leftPreferred !== rightPreferred) return leftPreferred - rightPreferred;
    if (segment.kind === "quiz" || segment.kind === "exam") {
      if (left.date !== right.date) return right.date.localeCompare(left.date);
    } else {
      const leftCount = assignedPerDay.get(left.date) ?? 0;
      const rightCount = assignedPerDay.get(right.date) ?? 0;
      if (leftCount !== rightCount) return leftCount - rightCount;
      if (left.date !== right.date) return left.date.localeCompare(right.date);
    }
    return left.startMinute - right.startMinute;
  });
  return valid[0];
};

const blockSourceFor = (
  item: RecommendationItemDraft,
  date: string,
  startTime: string,
  endTime: string,
  baseBlocks: BaseBlockRow[]
) => {
  const exact = baseBlocks.find(
    (block) =>
      block.subject_id === item.subjectId &&
      Number(block.schedule_type_id) === item.scheduleTypeId &&
      block.scheduled_date === date &&
      block.start_time.slice(0, 5) === startTime.slice(0, 5) &&
      block.end_time.slice(0, 5) === endTime.slice(0, 5)
  );
  if (!exact) {
    return {
      scheduleTimeId: null,
      sourceWeeklyBlockId: null,
      source: "generated" as const,
      isUserModified: false,
    };
  }
  return {
    scheduleTimeId: exact.schedule_time_id,
    sourceWeeklyBlockId: exact.weekly_block_id,
    source: (exact.weekly_block_id ? "copied_previous" : "copied_base") as
      | "copied_previous"
      | "copied_base",
    isUserModified: Boolean(exact.is_user_modified),
  };
};

const groupAssignedSlots = (
  assigned: AssignedSlot[],
  input: SchedulePlanInput
): PlannedBlock[] => {
  const sessionLimit = maximumSessionMinutes(input.constraint);
  const sorted = [...assigned].sort(
    (left, right) =>
      left.item.key.localeCompare(right.item.key) ||
      left.date.localeCompare(right.date) ||
      left.startMinute - right.startMinute
  );
  const blocks: PlannedBlock[] = [];
  for (const slot of sorted) {
    const previous = blocks[blocks.length - 1];
    const canMerge =
      previous &&
      previous.subjectId === slot.item.subjectId &&
      previous.scheduleTypeId === slot.item.scheduleTypeId &&
      previous.scheduledDate === slot.date &&
      timeToMinutes(previous.endTime) === slot.startMinute &&
      durationMinutes(previous.startTime, previous.endTime) < sessionLimit;
    if (canMerge) {
      previous.endTime = minutesToTime(slot.endMinute);
      continue;
    }
    blocks.push({
      recommendationItemId: slot.item.recommendationItemId ?? null,
      scheduleTimeId: null,
      sourceWeeklyBlockId: null,
      userId: input.userId,
      termId: input.termId,
      subjectId: slot.item.subjectId,
      scheduleTypeId: slot.item.scheduleTypeId,
      scheduledDate: slot.date,
      startTime: minutesToTime(slot.startMinute),
      endTime: minutesToTime(slot.endMinute),
      source: "generated",
      isUserModified: false,
    });
  }
  for (const block of blocks) {
    Object.assign(
      block,
      blockSourceFor(
        input.items.find(
          (item) =>
            item.subjectId === block.subjectId &&
            item.scheduleTypeId === block.scheduleTypeId
        )!,
        block.scheduledDate,
        block.startTime,
        block.endTime,
        input.baseBlocks
      )
    );
  }
  return blocks;
};

const compareItemBlocks = (
  item: RecommendationItemDraft,
  previous: BaseBlockRow[],
  planned: PlannedBlock[]
) => {
  const before = previous
    .filter(
      (block) =>
        block.subject_id === item.subjectId &&
        Number(block.schedule_type_id) === item.scheduleTypeId
    )
    .sort((left, right) =>
      `${left.scheduled_date}T${left.start_time}`.localeCompare(
        `${right.scheduled_date}T${right.start_time}`
      )
    );
  const after = planned
    .filter(
      (block) =>
        block.subjectId === item.subjectId &&
        block.scheduleTypeId === item.scheduleTypeId
    )
    .sort((left, right) =>
      `${left.scheduledDate}T${left.startTime}`.localeCompare(
        `${right.scheduledDate}T${right.startTime}`
      )
    );
  const changes: Array<Record<string, unknown>> = [];
  const count = Math.max(before.length, after.length);
  let moved = false;
  for (let index = 0; index < count; index += 1) {
    const oldBlock = before[index];
    const newBlock = after[index];
    if (!oldBlock && newBlock) {
      changes.push({ action: "create", to: newBlock });
      continue;
    }
    if (oldBlock && !newBlock) {
      changes.push({ action: "remove", from: oldBlock });
      continue;
    }
    if (!oldBlock || !newBlock) continue;
    const samePosition =
      oldBlock.scheduled_date === newBlock.scheduledDate &&
      oldBlock.start_time.slice(0, 5) === newBlock.startTime.slice(0, 5) &&
      oldBlock.end_time.slice(0, 5) === newBlock.endTime.slice(0, 5);
    if (!samePosition) {
      moved =
        moved ||
        oldBlock.scheduled_date !== newBlock.scheduledDate ||
        oldBlock.start_time.slice(0, 5) !== newBlock.startTime.slice(0, 5);
      changes.push({ action: moved ? "move" : "resize", from: oldBlock, to: newBlock });
    }
  }
  return { changes, moved };
};

export const buildSchedulePlan = (input: SchedulePlanInput) => {
  const immutableBaseBlocks = input.previousAcceptedRecommendationId
    ? input.baseBlocks.filter((block) => isPastBlock(block, input.now))
    : [];
  const futureBaseBlocks = input.baseBlocks.filter(
    (block) => !immutableBaseBlocks.includes(block)
  );
  const candidates = buildCandidateSlots(input, immutableBaseBlocks);
  const available = [...candidates];
  const assigned: AssignedSlot[] = [];
  const segments = input.items.flatMap(buildSegments);
  const sessionLimit = maximumSessionMinutes(input.constraint);

  for (const item of input.items) {
    item.allocatedMinutes = immutableBaseBlocks
      .filter(
        (block) =>
          block.subject_id === item.subjectId &&
          Number(block.schedule_type_id) === item.scheduleTypeId
      )
      .reduce(
        (sum, block) => sum + durationMinutes(block.start_time, block.end_time),
        0
      );
  }

  const preferredByItem = new Map<string, Set<string>>();
  for (const item of input.items) {
    const keys = new Set<string>();
    for (const block of futureBaseBlocks.filter(
      (base) =>
        base.subject_id === item.subjectId &&
        Number(base.schedule_type_id) === item.scheduleTypeId
    )) {
      for (
        let minute = timeToMinutes(block.start_time);
        minute + MIN_BLOCK_MINUTES <= timeToMinutes(block.end_time);
        minute += MIN_BLOCK_MINUTES
      ) {
        keys.add(`${block.scheduled_date}:${minute}`);
      }
    }
    preferredByItem.set(item.key, keys);
  }

  for (let priority = 1; priority <= 9; priority += 1) {
    const prioritySegments = segments.filter((segment) => segment.priority === priority);
    while (available.length > 0) {
      const eligible = prioritySegments.filter(
        (segment) => segment.allocatedMinutes < segment.targetMinutes
      );
      if (eligible.length === 0) break;
      eligible.sort((left, right) =>
        compareDemandFairness(left.item, right.item) || left.id.localeCompare(right.id)
      );

      let selected: { segment: DemandSegment; slot: CandidateSlot } | null = null;
      for (const segment of eligible) {
        if (segment.item.allocatedMinutes >= segment.item.targetMinutes) continue;
        const slot = chooseSlot(
          segment,
          available,
          preferredByItem.get(segment.item.key) ?? new Set<string>(),
          assigned
        );
        if (slot) {
          selected = { segment, slot };
          break;
        }
      }
      if (!selected) break;

      let sessionSlot: CandidateSlot | null = selected.slot;
      let sessionMinutes = 0;
      while (
        sessionSlot &&
        sessionMinutes < sessionLimit &&
        selected.segment.allocatedMinutes < selected.segment.targetMinutes &&
        selected.segment.item.allocatedMinutes < selected.segment.item.targetMinutes
      ) {
        selected.segment.allocatedMinutes += MIN_BLOCK_MINUTES;
        selected.segment.item.allocatedMinutes += MIN_BLOCK_MINUTES;
        assigned.push({ ...sessionSlot, item: selected.segment.item });
        const assignedSlot: CandidateSlot = sessionSlot;
        available.splice(
          available.findIndex((slot) => slot.key === assignedSlot.key),
          1
        );
        sessionMinutes += MIN_BLOCK_MINUTES;
        sessionSlot =
          available.find(
            (slot) =>
              slot.date === assignedSlot.date &&
              slot.startMinute === assignedSlot.endMinute &&
              slotBeforeDeadline(slot, selected.segment.deadline),
          ) ?? null;
      }
    }
  }

  const immutablePlanned: PlannedBlock[] = immutableBaseBlocks.map((block) => ({
    recommendationItemId:
      input.items.find(
        (item) =>
          item.subjectId === block.subject_id &&
          item.scheduleTypeId === Number(block.schedule_type_id)
      )?.recommendationItemId ?? null,
    scheduleTimeId: block.schedule_time_id,
    sourceWeeklyBlockId: block.weekly_block_id,
    userId: input.userId,
    termId: input.termId,
    subjectId: block.subject_id,
    scheduleTypeId: Number(block.schedule_type_id) as 2 | 3,
    scheduledDate: block.scheduled_date,
    startTime: block.start_time,
    endTime: block.end_time,
    source: block.weekly_block_id ? "copied_previous" : "copied_base",
    isUserModified: Boolean(block.is_user_modified),
  }));
  const blocks = [...immutablePlanned, ...groupAssignedSlots(assigned, input)];

  for (const item of input.items) {
    item.allocatedMinutes = blocks
      .filter(
        (block) =>
          block.subjectId === item.subjectId &&
          block.scheduleTypeId === item.scheduleTypeId
      )
      .reduce(
        (sum, block) => sum + durationMinutes(block.startTime, block.endTime),
        0
      );
    item.unallocatedMinutes = Math.max(0, item.targetMinutes - item.allocatedMinutes);
    item.capacityLimited = item.unallocatedMinutes > 0;
    item.differenceMinutes = item.allocatedMinutes - item.currentMinutes;
    const comparison = compareItemBlocks(item, input.baseBlocks, blocks);
    item.primaryAction = derivePrimaryAction(
      item.currentMinutes,
      item.allocatedMinutes,
      comparison.moved
    );
    (item as RecommendationItemDraft & { changes: unknown[] }).changes =
      comparison.changes;
  }
  return { items: input.items, blocks };
};

export const validateNoOverlaps = (blocks: PlannedBlock[]) => {
  const sorted = [...blocks].sort(
    (left, right) =>
      left.scheduledDate.localeCompare(right.scheduledDate) ||
      timeToMinutes(left.startTime) - timeToMinutes(right.startTime)
  );
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (
      previous.scheduledDate === current.scheduledDate &&
      overlaps(
        { start: timeToMinutes(previous.startTime), end: timeToMinutes(previous.endTime) },
        { start: timeToMinutes(current.startTime), end: timeToMinutes(current.endTime) }
      )
    ) {
      return false;
    }
  }
  return true;
};
