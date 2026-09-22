const constraintDays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type ConstraintDay = (typeof constraintDays)[number];

export const constraintDayToDatabase = (
  value: number | null | undefined,
): ConstraintDay | null => {
  if (value === null || value === undefined || value === 0) return null;
  if (!Number.isInteger(value) || value < 1 || value > constraintDays.length) {
    throw new Error("Constraint day must be between 1 and 7");
  }
  return constraintDays[value - 1];
};

export const constraintDayToNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 1 && value <= 7 ? value : null;
  }
  const index = constraintDays.indexOf(
    String(value).toLowerCase() as ConstraintDay,
  );
  return index === -1 ? null : index + 1;
};
