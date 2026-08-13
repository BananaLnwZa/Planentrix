const pad2 = (value: number) => String(value).padStart(2, "0");

const parseDate = (value: string | Date) => {
  if (value instanceof Date) return value;
  return new Date(value.includes(" ") ? value.replace(" ", "T") : value);
};

export const formatDisplayDate = (
  value?: string | Date | null,
  fallback = "—"
) => {
  if (!value) return fallback;

  if (typeof value === "string") {
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|\s)/);
    if (dateOnly) {
      return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
    }
  }

  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export const formatDisplayTime = (
  value?: string | Date | null,
  fallback = "—"
) => {
  if (!value) return fallback;

  if (typeof value === "string") {
    const timeOnly = value.match(/^(\d{1,2}):(\d{2})/);
    if (timeOnly) return `${pad2(Number(timeOnly[1]))}:${timeOnly[2]}`;
  }

  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

export const formatDisplayDateTime = (
  value?: string | Date | null,
  fallback = "—"
) => {
  if (!value) return fallback;
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return `${formatDisplayDate(date, fallback)} ${formatDisplayTime(date, fallback)}`;
};

export const formatDisplayMonthYear = (monthKey: string) => {
  const match = monthKey.match(/^(\d{4})-(\d{1,2})$/);
  if (!match) return monthKey;
  return `${pad2(Number(match[2]))}/${match[1]}`;
};
