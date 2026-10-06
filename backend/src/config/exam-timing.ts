// Temporarily disabled while question_banks has no time_limit_minutes column.
// Restore the column before enabling timed exams again.
export const EXAM_TIME_LIMITS_ENABLED = false;

export const questionBankTimeLimitSql = (alias: "qb" | "bank") =>
  EXAM_TIME_LIMITS_ENABLED ? `${alias}.time_limit_minutes` : "NULL";
