import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";

export const GRADE_CODES = [
  "A",
  "B+",
  "B",
  "C+",
  "C",
  "D+",
  "D",
  "F",
] as const;

export type GradeCode = (typeof GRADE_CODES)[number];

export interface GradeBoundaryInput {
  grade_code: GradeCode;
  minimum_percentage: number;
  display_order: number;
}

export const DEFAULT_GRADE_BOUNDARIES: GradeBoundaryInput[] = [
  { grade_code: "A", minimum_percentage: 80, display_order: 1 },
  { grade_code: "B+", minimum_percentage: 75, display_order: 2 },
  { grade_code: "B", minimum_percentage: 70, display_order: 3 },
  { grade_code: "C+", minimum_percentage: 65, display_order: 4 },
  { grade_code: "C", minimum_percentage: 60, display_order: 5 },
  { grade_code: "D+", minimum_percentage: 55, display_order: 6 },
  { grade_code: "D", minimum_percentage: 50, display_order: 7 },
  { grade_code: "F", minimum_percentage: 0, display_order: 8 },
];

interface SchemeIdRow extends RowDataPacket {
  grading_scheme_id: number;
}

export const insertGradeBoundaries = async (
  connection: PoolConnection,
  schemeId: number,
  boundaries: GradeBoundaryInput[],
) => {
  const placeholders = boundaries.map(() => "(?, ?, ?, ?)").join(", ");
  const values = boundaries.flatMap((boundary) => [
    schemeId,
    boundary.grade_code,
    boundary.minimum_percentage,
    boundary.display_order,
  ]);

  await connection.query(
    `INSERT INTO grade_boundaries
      (grading_scheme_id, grade_code, minimum_percentage, display_order)
     VALUES ${placeholders}`,
    values,
  );
};

export const ensureSubjectDefaultGradingScheme = async (
  connection: PoolConnection,
  subjectId: string,
  adminId: number,
): Promise<number> => {
  const [subjects] = await connection.query<RowDataPacket[]>(
    `SELECT subject_id
     FROM subjects
     WHERE BINARY subject_id = ? AND is_active = 1
     LIMIT 1
     FOR UPDATE`,
    [subjectId],
  );
  if (!subjects[0]) {
    throw new Error(`Cannot create grading scheme for inactive subject ${subjectId}`);
  }

  const [existing] = await connection.query<SchemeIdRow[]>(
    `SELECT grading_scheme_id
     FROM grading_schemes
     WHERE BINARY subject_id = ?
       AND scheme_type = 'subject_default'
       AND section_id IS NULL
       AND status <> 'archived'
     ORDER BY (status = 'published') DESC, version DESC
     LIMIT 1
     FOR UPDATE`,
    [subjectId],
  );
  if (existing[0]) {
    return Number(existing[0].grading_scheme_id);
  }

  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO grading_schemes
      (subject_id, section_id, source_scheme_id, scheme_type, version, status,
       created_by_admin_id, updated_by_admin_id, published_by_admin_id,
       published_at)
     VALUES (?, NULL, NULL, 'subject_default', 1, 'published', ?, ?, ?, NOW())`,
    [subjectId, adminId, adminId, adminId],
  );
  await insertGradeBoundaries(
    connection,
    result.insertId,
    DEFAULT_GRADE_BOUNDARIES,
  );
  return result.insertId;
};

export const createSectionGradingSchemeFromDefault = async (
  connection: PoolConnection,
  subjectId: string,
  sectionId: number,
  adminId: number,
  existingSourceSchemeId?: number,
): Promise<number> => {
  const [existing] = await connection.query<SchemeIdRow[]>(
    `SELECT grading_scheme_id
     FROM grading_schemes
     WHERE section_id = ? AND scheme_type = 'section'
     ORDER BY version DESC
     LIMIT 1
     FOR UPDATE`,
    [sectionId],
  );
  if (existing[0]) {
    return Number(existing[0].grading_scheme_id);
  }

  const sourceSchemeId =
    existingSourceSchemeId ??
    (await ensureSubjectDefaultGradingScheme(connection, subjectId, adminId));
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO grading_schemes
      (subject_id, section_id, source_scheme_id, scheme_type, version, status,
       created_by_admin_id, updated_by_admin_id)
     VALUES (?, ?, ?, 'section', 1, 'draft', ?, ?)`,
    [subjectId, sectionId, sourceSchemeId, adminId, adminId],
  );
  await connection.query(
    `INSERT INTO grade_boundaries
      (grading_scheme_id, grade_code, minimum_percentage, display_order)
     SELECT ?, grade_code, minimum_percentage, display_order
     FROM grade_boundaries
     WHERE grading_scheme_id = ?
     ORDER BY display_order`,
    [result.insertId, sourceSchemeId],
  );
  return result.insertId;
};
