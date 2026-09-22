import {
  FALLBACK_STUDY_TYPE_NAME,
  getMappedStudyTypeName,
  resolveReviewMethod,
  type ReviewMethodChoice,
} from "./review-method.rules";

const methods: Record<string, ReviewMethodChoice> = {
  reading: { studyTypeId: 1, studyTypeName: "reading" },
  practice: { studyTypeId: 2, studyTypeName: "practice" },
  video: { studyTypeId: 3, studyTypeName: "video" },
  review: { studyTypeId: 4, studyTypeName: "review" },
};

export const getReviewMethodForSubjectType = async (
  subjectTypeName: string | null | undefined,
) => {
  const mappedStudyTypeName = getMappedStudyTypeName(subjectTypeName);
  const findMethod = (studyTypeName: string | null) =>
    studyTypeName ? methods[studyTypeName.toLowerCase()] ?? null : null;

  return resolveReviewMethod(
    findMethod(mappedStudyTypeName),
    findMethod(FALLBACK_STUDY_TYPE_NAME),
  );
};
