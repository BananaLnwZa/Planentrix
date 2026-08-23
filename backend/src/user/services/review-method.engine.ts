import type { RowDataPacket } from "mysql2/promise";
import db from "../../config/db";
import {
  FALLBACK_STUDY_TYPE_NAME,
  getMappedStudyTypeName,
  resolveReviewMethod,
  type ReviewMethodChoice,
} from "./review-method.rules";

interface ReviewMethodRow extends RowDataPacket {
  study_type_id: number;
  study_type_name: string;
}

const serializeMethod = (
  row: ReviewMethodRow | undefined,
): ReviewMethodChoice | null =>
  row
    ? {
        studyTypeId: Number(row.study_type_id),
        studyTypeName: row.study_type_name,
      }
    : null;

export const getReviewMethodForSubjectType = async (
  subjectTypeName: string | null | undefined,
) => {
  const mappedStudyTypeName = getMappedStudyTypeName(subjectTypeName);
  const requestedNames = Array.from(
    new Set(
      [mappedStudyTypeName, FALLBACK_STUDY_TYPE_NAME].filter(
        (name): name is string => Boolean(name),
      ),
    ),
  );
  const placeholders = requestedNames.map(() => "?").join(", ");
  const [rows] = await db.query<ReviewMethodRow[]>(
    `SELECT study_type_id, study_type_name
     FROM study_types
     WHERE LOWER(study_type_name) IN (${placeholders})
     ORDER BY study_type_id`,
    requestedNames,
  );

  const findMethod = (studyTypeName: string | null) =>
    serializeMethod(
      studyTypeName
        ? rows.find(
            (row) => row.study_type_name.toLowerCase() === studyTypeName,
          )
        : undefined,
    );

  return resolveReviewMethod(
    findMethod(mappedStudyTypeName),
    findMethod(FALLBACK_STUDY_TYPE_NAME),
  );
};
