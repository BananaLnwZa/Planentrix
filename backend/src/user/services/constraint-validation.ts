type BusyTimeInput = {
  day: number;
  start: string;
  end: string;
};

type ConstraintInput = {
  dayOff?: number | null;
  continuousWorkingDuration?: number | null;
  breakDuration?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  busyDays?: BusyTimeInput[] | null;
};

const timePattern = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

const timeToMinutes = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

const coversWorkWindow = (
  busyDays: BusyTimeInput[],
  day: number,
  workStart: number,
  workEnd: number,
) => {
  const intervals = busyDays
    .filter(
      (busy) =>
        busy.day === day &&
        timePattern.test(busy.start) &&
        timePattern.test(busy.end) &&
        timeToMinutes(busy.start) < timeToMinutes(busy.end),
    )
    .map((busy) => ({
      start: Math.max(workStart, timeToMinutes(busy.start)),
      end: Math.min(workEnd, timeToMinutes(busy.end)),
    }))
    .filter((interval) => interval.start < interval.end)
    .sort((left, right) => left.start - right.start);

  let cursor = workStart;
  for (const interval of intervals) {
    if (interval.start > cursor) return false;
    cursor = Math.max(cursor, interval.end);
    if (cursor >= workEnd) return true;
  }
  return cursor >= workEnd;
};

export function validateConstraintForSave(input: ConstraintInput) {
  const errors: string[] = [];
  const continuous = Number(input.continuousWorkingDuration);
  const breakDuration =
    input.breakDuration === null || input.breakDuration === undefined
      ? null
      : Number(input.breakDuration);
  const busyDays = Array.isArray(input.busyDays) ? input.busyDays : [];

  if (!Number.isFinite(continuous) || continuous <= 0) {
    errors.push("continuous_working_duration must be greater than 0");
  }
  if (breakDuration !== null && (!Number.isFinite(breakDuration) || breakDuration < 0)) {
    errors.push("break must not be negative");
  } else if (
    breakDuration !== null &&
    Number.isFinite(continuous) &&
    continuous > 0 &&
    breakDuration >= continuous
  ) {
    errors.push("break must be less than continuous_working_duration");
  }

  const hasStart = Boolean(input.startTime);
  const hasEnd = Boolean(input.endTime);
  if (hasStart !== hasEnd) {
    errors.push("start_time and end_time must both be provided");
  }

  const validWorkTime =
    Boolean(input.startTime) &&
    Boolean(input.endTime) &&
    timePattern.test(input.startTime!) &&
    timePattern.test(input.endTime!) &&
    timeToMinutes(input.startTime!) < timeToMinutes(input.endTime!);

  if (validWorkTime) {
    const workStart = timeToMinutes(input.startTime!);
    const workEnd = timeToMinutes(input.endTime!);
    if (Number.isFinite(continuous) && continuous > workEnd - workStart) {
      errors.push(
        "continuous_working_duration must not exceed the working time window",
      );
    }
    const everyDayUnavailable = Array.from({ length: 7 }, (_, index) => index + 1)
      .every(
        (day) =>
          input.dayOff === day ||
          coversWorkWindow(busyDays, day, workStart, workEnd),
      );
    if (everyDayUnavailable) {
      errors.push("day_off and busy_days leave no working time on any day");
    }
  }

  return errors;
}
