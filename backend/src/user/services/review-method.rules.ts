export const WEAK_TOPIC_PERCENTAGE = 50;
export const FALLBACK_STUDY_TYPE_NAME = "review";

const SUBJECT_REVIEW_METHOD_RULES: Readonly<Record<string, string>> = {
  "ทฤษฎีและหลักการ": "reading",
  "เขียนโปรแกรม": "practice",
  "ออกแบบและวิเคราะห์ระบบ": "review",
  "ฐานข้อมูล": "practice",
  "เครือข่ายและความปลอดภัย": "video",
  "ปัญญาประดิษฐ์และข้อมูล": "practice",
  "เว็บและแอปพลิเคชัน": "practice",
  "โครงงานและฝึกงาน": "review",
};

export interface ReviewMethodChoice {
  studyTypeId: number;
  studyTypeName: string;
}

export const isWeakTopic = (percentage: number) =>
  Number.isFinite(percentage) && percentage < WEAK_TOPIC_PERCENTAGE;

export const getMappedStudyTypeName = (
  subjectTypeName: string | null | undefined,
) => {
  const normalizedName = subjectTypeName?.trim();
  return normalizedName
    ? SUBJECT_REVIEW_METHOD_RULES[normalizedName] ?? null
    : null;
};

export const resolveReviewMethod = (
  mappedMethod: ReviewMethodChoice | null | undefined,
  fallbackMethod: ReviewMethodChoice | null | undefined,
) => {
  const method = mappedMethod ?? fallbackMethod;
  if (!method) {
    throw new Error(
      `Review method mapping and '${FALLBACK_STUDY_TYPE_NAME}' fallback were not found`,
    );
  }

  return {
    ...method,
    fallbackUsed: !mappedMethod,
  };
};
