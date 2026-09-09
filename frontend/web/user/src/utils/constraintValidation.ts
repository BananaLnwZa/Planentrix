export type ConstraintBusyTime = {
  day: number;
  start: string;
  end: string;
};

export type ConstraintValidationInput = {
  dayOff?: number | null;
  continuousWorkingDuration?: number | null;
  breakDuration?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  busyDays?: ConstraintBusyTime[];
};

export type ConstraintValidationResult = {
  errors: string[];
  warnings: string[];
};

const dayNames = [
  "วันจันทร์",
  "วันอังคาร",
  "วันพุธ",
  "วันพฤหัสบดี",
  "วันศุกร์",
  "วันเสาร์",
  "วันอาทิตย์",
];

const timeToMinutes = (value?: string | null) => {
  if (!value) return null;
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
};

const formatTime = (value: string) => value.slice(0, 5);

type Interval = { start: number; end: number };

const mergeIntervals = (intervals: Interval[]) => {
  const sorted = [...intervals].sort((left, right) => left.start - right.start);
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const latest = merged.at(-1);
    if (!latest || interval.start > latest.end) {
      merged.push({ ...interval });
    } else {
      latest.end = Math.max(latest.end, interval.end);
    }
  }
  return merged;
};

const unique = (messages: string[]) => Array.from(new Set(messages));

export function validateConstraintInput(
  input: ConstraintValidationInput
): ConstraintValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const continuous = input.continuousWorkingDuration;
  const breakDuration = input.breakDuration;
  const start = timeToMinutes(input.startTime);
  const end = timeToMinutes(input.endTime);
  const busyDays = input.busyDays ?? [];

  if (continuous === null || continuous === undefined || !Number.isFinite(continuous)) {
    errors.push("กรุณาระบุระยะเวลาทำงานต่อเนื่อง");
  } else if (continuous <= 0) {
    errors.push("ระยะเวลาทำงานต่อเนื่องต้องมากกว่า 0 นาที");
  }

  if (breakDuration !== null && breakDuration !== undefined) {
    if (!Number.isFinite(breakDuration) || breakDuration < 0) {
      errors.push("ระยะเวลาพักต้องไม่ติดลบ");
    } else if (
      continuous !== null &&
      continuous !== undefined &&
      Number.isFinite(continuous) &&
      continuous > 0 &&
      breakDuration >= continuous
    ) {
      errors.push("ระยะเวลาพักต้องน้อยกว่าระยะเวลาทำงานต่อเนื่อง");
    }
  }

  if (Boolean(input.startTime) !== Boolean(input.endTime)) {
    errors.push("กรุณาเลือกเวลาเริ่มและเวลาสิ้นสุดการทำงานให้ครบ");
  } else if (input.startTime && input.endTime) {
    if (start === null || end === null) {
      errors.push("รูปแบบเวลาทำงานไม่ถูกต้อง");
    } else if (start >= end) {
      errors.push("เวลาเริ่มทำงานต้องน้อยกว่าเวลาสิ้นสุด");
    }
  }

  const validBusy = busyDays.flatMap((busy, index) => {
    const busyStart = timeToMinutes(busy.start);
    const busyEnd = timeToMinutes(busy.end);
    if (busy.day < 1 || busy.day > 7) {
      errors.push(`วันของรายการไม่ว่างที่ ${index + 1} ไม่ถูกต้อง`);
      return [];
    }
    if (busyStart === null || busyEnd === null) {
      errors.push(`กรุณาเลือกเวลาเริ่มและสิ้นสุดของรายการไม่ว่างที่ ${index + 1} ให้ครบ`);
      return [];
    }
    if (busyStart >= busyEnd) {
      errors.push(`เวลาเริ่มของรายการไม่ว่างที่ ${index + 1} ต้องน้อยกว่าเวลาสิ้นสุด`);
      return [];
    }
    return [{ ...busy, index, startMinutes: busyStart, endMinutes: busyEnd }];
  });

  for (let leftIndex = 0; leftIndex < validBusy.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < validBusy.length; rightIndex += 1) {
      const left = validBusy[leftIndex];
      const right = validBusy[rightIndex];
      if (
        left.day === right.day &&
        left.startMinutes < right.endMinutes &&
        left.endMinutes > right.startMinutes
      ) {
        warnings.push(
          `${dayNames[left.day - 1]}: รายการที่ ${left.index + 1} ` +
            `${formatTime(left.start)}–${formatTime(left.end)} ทับกับรายการที่ ` +
            `${right.index + 1} ${formatTime(right.start)}–${formatTime(right.end)}`
        );
      }
    }
  }

  if (start !== null && end !== null && start < end) {
    const workWindow = end - start;
    if (continuous !== null && continuous !== undefined && continuous > workWindow) {
      errors.push(
        `ระยะเวลาทำงานต่อเนื่อง ${continuous} นาที ยาวกว่าช่วงเวลาทำงาน ${workWindow} นาที`
      );
    }
    if (breakDuration !== null && breakDuration !== undefined && breakDuration >= workWindow) {
      warnings.push(
        `ระยะเวลาพัก ${breakDuration} นาที ยาวกว่าหรือเท่ากับช่วงเวลาทำงาน ${workWindow} นาที`
      );
    }

    const unavailableDays: number[] = [];
    const busyCoveredDays: number[] = [];
    const shortRemainingDays: number[] = [];

    for (let day = 1; day <= 7; day += 1) {
      if (input.dayOff === day) {
        unavailableDays.push(day);
        continue;
      }

      const intervals = mergeIntervals(
        validBusy
          .filter((busy) => busy.day === day)
          .map((busy) => ({
            start: Math.max(start, busy.startMinutes),
            end: Math.min(end, busy.endMinutes),
          }))
          .filter((interval) => interval.start < interval.end)
      );
      const freeDurations: number[] = [];
      let cursor = start;
      for (const interval of intervals) {
        if (interval.start > cursor) freeDurations.push(interval.start - cursor);
        cursor = Math.max(cursor, interval.end);
      }
      if (cursor < end) freeDurations.push(end - cursor);

      if (freeDurations.length === 0) {
        unavailableDays.push(day);
        busyCoveredDays.push(day);
      } else if (
        continuous !== null &&
        continuous !== undefined &&
        continuous > 0 &&
        Math.max(...freeDurations) < continuous
      ) {
        shortRemainingDays.push(day);
      }
    }

    if (unavailableDays.length === 7) {
      errors.push("วันหยุดและเวลาที่ไม่ว่างปิดช่วงเวลาทำงานครบทุกวัน จึงไม่สามารถสร้างตารางได้");
    } else if (busyCoveredDays.length > 0) {
      warnings.push(
        `เวลาที่ไม่ว่างทับช่วงเวลาทำงานทั้งหมดใน${busyCoveredDays
          .map((day) => dayNames[day - 1])
          .join(", ")}`
      );
    }

    if (shortRemainingDays.length > 0) {
      warnings.push(
        `เวลาที่เหลือใน${shortRemainingDays
          .map((day) => dayNames[day - 1])
          .join(", ")} สั้นกว่าระยะเวลาทำงานต่อเนื่องที่กำหนด`
      );
    }
  }

  return { errors: unique(errors), warnings: unique(warnings) };
}
