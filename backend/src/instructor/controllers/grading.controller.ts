import type { Request, Response } from "express";
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import db from "../../config/db";

const GRADE_CODES = ["A", "B+", "B", "C+", "C", "D+", "D", "F"] as const;
type GradeCode = (typeof GRADE_CODES)[number];

const DEFAULT_BOUNDARIES: Array<{
  grade_code: GradeCode;
  minimum_percentage: number;
}> = [
  { grade_code: "A", minimum_percentage: 80 },
  { grade_code: "B+", minimum_percentage: 75 },
  { grade_code: "B", minimum_percentage: 70 },
  { grade_code: "C+", minimum_percentage: 65 },
  { grade_code: "C", minimum_percentage: 60 },
  { grade_code: "D+", minimum_percentage: 55 },
  { grade_code: "D", minimum_percentage: 50 },
  { grade_code: "F", minimum_percentage: 0 },
];

interface GradingSectionRow extends RowDataPacket {
  section_id: number;
  subject_id: string;
  subject_name: string;
  academic_term_id: number;
  academic_year: number;
  semester_no: number;
  section_number: string;
  section_status: string;
  instructor_role: "owner" | "co_instructor";
}

interface GradingSchemeRow extends RowDataPacket {
  grading_scheme_id: number;
  subject_id: string;
  section_id: number;
  source_scheme_id: number | null;
  version: number;
  status: "draft" | "published" | "archived";
  created_by_admin_id: number;
  updated_by_admin_id: number | null;
  published_by_admin_id: number | null;
  published_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface GradeBoundaryRow extends RowDataPacket {
  grade_boundary_id: number;
  grading_scheme_id: number;
  grade_code: GradeCode;
  minimum_percentage: number | string;
  display_order: number;
}

interface SectionAccessRow extends RowDataPacket {
  section_id: number;
  subject_id: string;
  instructor_role: "owner" | "co_instructor";
}

interface SchemeAccessRow extends GradingSchemeRow {
  instructor_role: "owner" | "co_instructor";
}

interface BoundaryInput {
  grade_code: GradeCode;
  minimum_percentage: number;
  display_order: number;
}

const requireInstructor = (req: Request, res: Response): number | null => {
  if (!req.user?.id) {
    res.status(401).json({ message: "Unauthorized: Missing instructor ID" });
    return null;
  }
  if (req.user.role !== "instructor") {
    res.status(403).json({ message: "Forbidden: Instructor access required" });
    return null;
  }
  return Number(req.user.id);
};

const positiveId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const validateBoundaries = (
  value: unknown,
): { valid: true; boundaries: BoundaryInput[] } | { valid: false; error: string } => {
  if (!Array.isArray(value) || value.length !== GRADE_CODES.length) {
    return {
      valid: false,
      error: "กรุณากำหนดคะแนนขั้นต่ำให้ครบทุกเกรด A ถึง F",
    };
  }

  const byCode = new Map<string, number>();
  for (const rawBoundary of value) {
    if (!rawBoundary || typeof rawBoundary !== "object") {
      return { valid: false, error: "ข้อมูลช่วงคะแนนไม่ถูกต้อง" };
    }
    const boundary = rawBoundary as Record<string, unknown>;
    const gradeCode = String(boundary.grade_code ?? "").trim();
    const rawMinimum = String(boundary.minimum_percentage ?? "").trim();
    const minimum = Number(rawMinimum);
    if (!GRADE_CODES.includes(gradeCode as GradeCode) || byCode.has(gradeCode)) {
      return { valid: false, error: "รหัสเกรดซ้ำหรือไม่ถูกต้อง" };
    }
    if (
      !/^\d{1,3}(?:\.\d{1,2})?$/.test(rawMinimum) ||
      !Number.isFinite(minimum) ||
      minimum < 0 ||
      minimum > 100
    ) {
      return {
        valid: false,
        error: `คะแนนขั้นต่ำของเกรด ${gradeCode} ต้องอยู่ระหว่าง 0-100 และมีทศนิยมไม่เกิน 2 ตำแหน่ง`,
      };
    }
    byCode.set(gradeCode, minimum);
  }

  const ordered = GRADE_CODES.map((gradeCode, index) => ({
    grade_code: gradeCode,
    minimum_percentage: byCode.get(gradeCode) as number,
    display_order: index + 1,
  }));
  if (ordered[ordered.length - 1].minimum_percentage !== 0) {
    return { valid: false, error: "คะแนนขั้นต่ำของเกรด F ต้องเป็น 0" };
  }
  for (let index = 1; index < ordered.length; index += 1) {
    if (
      ordered[index - 1].minimum_percentage <=
      ordered[index].minimum_percentage
    ) {
      return {
        valid: false,
        error: `คะแนนขั้นต่ำของเกรด ${ordered[index - 1].grade_code} ต้องมากกว่าเกรด ${ordered[index].grade_code}`,
      };
    }
  }
  return { valid: true, boundaries: ordered };
};

const serializeScheme = (
  scheme: GradingSchemeRow,
  boundaries: GradeBoundaryRow[],
) => ({
  ...scheme,
  grading_scheme_id: Number(scheme.grading_scheme_id),
  section_id: Number(scheme.section_id),
  source_scheme_id:
    scheme.source_scheme_id === null ? null : Number(scheme.source_scheme_id),
  version: Number(scheme.version),
  boundaries: boundaries.map((boundary) => ({
    grade_boundary_id: Number(boundary.grade_boundary_id),
    grading_scheme_id: Number(boundary.grading_scheme_id),
    grade_code: boundary.grade_code,
    minimum_percentage: Number(boundary.minimum_percentage),
    display_order: Number(boundary.display_order),
  })),
});

const getSectionAccess = async (
  connection: PoolConnection,
  sectionId: number,
  instructorId: number,
): Promise<SectionAccessRow | undefined> => {
  const [rows] = await connection.query<SectionAccessRow[]>(
    `SELECT section.section_id, section.subject_id, assignment.instructor_role
     FROM course_sections section
     INNER JOIN section_instructors assignment
       ON assignment.section_id = section.section_id
      AND assignment.instructor_id = ?
     INNER JOIN academic_terms term
       ON term.academic_term_id = section.academic_term_id
     WHERE section.section_id = ?
       AND section.status <> 'cancelled'
       AND term.status <> 'archived'
     LIMIT 1
     FOR UPDATE`,
    [instructorId, sectionId],
  );
  return rows[0];
};

const getSchemeAccess = async (
  connection: PoolConnection,
  schemeId: number,
  instructorId: number,
): Promise<SchemeAccessRow | undefined> => {
  const [rows] = await connection.query<SchemeAccessRow[]>(
    `SELECT scheme.grading_scheme_id, scheme.subject_id, scheme.section_id,
            scheme.source_scheme_id, scheme.version, scheme.status,
            scheme.created_by_admin_id, scheme.updated_by_admin_id,
            scheme.published_by_admin_id, scheme.published_at,
            scheme.created_at, scheme.updated_at,
            assignment.instructor_role
     FROM grading_schemes scheme
     INNER JOIN section_instructors assignment
       ON assignment.section_id = scheme.section_id
      AND assignment.instructor_id = ?
     INNER JOIN course_sections section
       ON section.section_id = scheme.section_id
     INNER JOIN academic_terms term
       ON term.academic_term_id = section.academic_term_id
     WHERE scheme.grading_scheme_id = ?
       AND section.status <> 'cancelled'
       AND term.status <> 'archived'
     LIMIT 1
     FOR UPDATE`,
    [instructorId, schemeId],
  );
  return rows[0];
};

const insertBoundaries = async (
  connection: PoolConnection,
  schemeId: number,
  boundaries: BoundaryInput[],
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

export const getInstructorGradingWorkspace = async (
  req: Request,
  res: Response,
) => {
  const instructorId = requireInstructor(req, res);
  if (!instructorId) return;

  try {
    const [sections] = await db.query<GradingSectionRow[]>(
      `SELECT section.section_id, section.subject_id, subject.subject_name,
              section.academic_term_id, term.academic_year, term.semester_no,
              section.section_number, section.status AS section_status,
              assignment.instructor_role
       FROM section_instructors assignment
       INNER JOIN course_sections section
         ON section.section_id = assignment.section_id
       INNER JOIN subjects subject ON subject.subject_id = section.subject_id
       INNER JOIN academic_terms term
         ON term.academic_term_id = section.academic_term_id
       WHERE assignment.instructor_id = ?
         AND section.status <> 'cancelled'
         AND term.status <> 'archived'
       ORDER BY term.academic_year DESC, term.semester_no DESC,
         subject.subject_id, section.section_number`,
      [instructorId],
    );
    const [schemes] = await db.query<GradingSchemeRow[]>(
      `SELECT DISTINCT
              scheme.grading_scheme_id, scheme.subject_id, scheme.section_id,
              scheme.source_scheme_id, scheme.version, scheme.status,
              scheme.created_by_admin_id, scheme.updated_by_admin_id,
              scheme.published_by_admin_id, scheme.published_at,
              scheme.created_at, scheme.updated_at
       FROM grading_schemes scheme
       INNER JOIN section_instructors assignment
         ON assignment.section_id = scheme.section_id
        AND assignment.instructor_id = ?
       INNER JOIN course_sections section
         ON section.section_id = scheme.section_id
        AND section.status <> 'cancelled'
       INNER JOIN academic_terms term
         ON term.academic_term_id = section.academic_term_id
        AND term.status <> 'archived'
       ORDER BY scheme.section_id, scheme.version DESC`,
      [instructorId],
    );
    const [boundaries] = await db.query<GradeBoundaryRow[]>(
      `SELECT boundary.grade_boundary_id, boundary.grading_scheme_id,
              boundary.grade_code, boundary.minimum_percentage,
              boundary.display_order
       FROM grade_boundaries boundary
       INNER JOIN grading_schemes scheme
         ON scheme.grading_scheme_id = boundary.grading_scheme_id
       INNER JOIN section_instructors assignment
         ON assignment.section_id = scheme.section_id
        AND assignment.instructor_id = ?
       INNER JOIN course_sections section
         ON section.section_id = scheme.section_id
        AND section.status <> 'cancelled'
       INNER JOIN academic_terms term
         ON term.academic_term_id = section.academic_term_id
        AND term.status <> 'archived'
       ORDER BY boundary.grading_scheme_id, boundary.display_order`,
      [instructorId],
    );

    const boundariesByScheme = new Map<number, GradeBoundaryRow[]>();
    for (const boundary of boundaries) {
      const schemeId = Number(boundary.grading_scheme_id);
      const current = boundariesByScheme.get(schemeId) ?? [];
      current.push(boundary);
      boundariesByScheme.set(schemeId, current);
    }

    return res.json({
      message: "Instructor grading workspace retrieved successfully",
      sections: sections.map((section) => ({
        ...section,
        section_id: Number(section.section_id),
        academic_term_id: Number(section.academic_term_id),
        academic_year: Number(section.academic_year),
        semester_no: Number(section.semester_no),
        can_manage: section.instructor_role === "owner",
      })),
      grading_schemes: schemes.map((scheme) =>
        serializeScheme(
          scheme,
          boundariesByScheme.get(Number(scheme.grading_scheme_id)) ?? [],
        ),
      ),
      grade_codes: GRADE_CODES,
    });
  } catch (error) {
    console.error("getInstructorGradingWorkspace error:", error);
    return res.status(500).json({ message: "ไม่สามารถโหลดเกณฑ์ตัดเกรดได้" });
  }
};

export const createInstructorGradingDraft = async (
  req: Request,
  res: Response,
) => {
  const instructorId = requireInstructor(req, res);
  if (!instructorId) return;
  const sectionId = positiveId(req.body.section_id);
  if (!sectionId) {
    return res.status(400).json({ message: "รหัสกลุ่มเรียนไม่ถูกต้อง" });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const access = await getSectionAccess(connection, sectionId, instructorId);
    if (!access) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบกลุ่มเรียนที่ได้รับมอบหมาย" });
    }
    if (access.instructor_role !== "owner") {
      await connection.rollback();
      return res.status(403).json({
        message: "เฉพาะอาจารย์เจ้าของวิชาเท่านั้นที่สร้างเกณฑ์ตัดเกรดได้",
      });
    }

    const [existing] = await connection.query<GradingSchemeRow[]>(
      `SELECT grading_scheme_id, subject_id, section_id, source_scheme_id,
              version, status, created_by_admin_id, updated_by_admin_id,
              published_by_admin_id, published_at, created_at, updated_at
       FROM grading_schemes
       WHERE section_id = ?
       ORDER BY version DESC
       FOR UPDATE`,
      [sectionId],
    );
    if (existing.some((scheme) => scheme.status === "draft")) {
      await connection.rollback();
      return res.status(409).json({
        message: "กลุ่มเรียนนี้มีฉบับร่างอยู่แล้ว กรุณาแก้ไขฉบับเดิม",
      });
    }

    const version =
      existing.reduce((maximum, scheme) => Math.max(maximum, Number(scheme.version)), 0) +
      1;
    const source =
      existing.find((scheme) => scheme.status === "published") ?? existing[0];
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO grading_schemes
        (subject_id, section_id, source_scheme_id, scheme_type, version,
         status, created_by_admin_id, updated_by_admin_id)
       VALUES (?, ?, ?, 'section', ?, 'draft', ?, ?)`,
      [
        access.subject_id,
        sectionId,
        source?.grading_scheme_id ?? null,
        version,
        instructorId,
        instructorId,
      ],
    );

    if (source) {
      await connection.query(
        `INSERT INTO grade_boundaries
          (grading_scheme_id, grade_code, minimum_percentage, display_order)
         SELECT ?, grade_code, minimum_percentage, display_order
         FROM grade_boundaries
         WHERE grading_scheme_id = ?
         ORDER BY display_order`,
        [result.insertId, source.grading_scheme_id],
      );
    } else {
      await insertBoundaries(
        connection,
        result.insertId,
        DEFAULT_BOUNDARIES.map((boundary, index) => ({
          ...boundary,
          display_order: index + 1,
        })),
      );
    }

    await connection.commit();
    return res.status(201).json({
      message: `สร้างเกณฑ์ตัดเกรดฉบับร่าง Version ${version} สำเร็จ`,
      grading_scheme_id: result.insertId,
      version,
    });
  } catch (error) {
    await connection.rollback();
    console.error("createInstructorGradingDraft error:", error);
    return res.status(500).json({ message: "ไม่สามารถสร้างฉบับร่างได้" });
  } finally {
    connection.release();
  }
};

export const updateInstructorGradingDraft = async (
  req: Request,
  res: Response,
) => {
  const instructorId = requireInstructor(req, res);
  if (!instructorId) return;
  const schemeId = positiveId(req.params.schemeId);
  if (!schemeId) {
    return res.status(400).json({ message: "รหัสเกณฑ์ตัดเกรดไม่ถูกต้อง" });
  }
  const validation = validateBoundaries(req.body.boundaries);
  if (!validation.valid) {
    return res.status(400).json({ message: validation.error });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const scheme = await getSchemeAccess(connection, schemeId, instructorId);
    if (!scheme) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบเกณฑ์ตัดเกรด" });
    }
    if (scheme.instructor_role !== "owner") {
      await connection.rollback();
      return res.status(403).json({
        message: "เฉพาะอาจารย์เจ้าของวิชาเท่านั้นที่แก้ไขเกณฑ์ได้",
      });
    }
    if (scheme.status !== "draft") {
      await connection.rollback();
      return res.status(409).json({
        message: "แก้ไขได้เฉพาะฉบับร่าง กรุณาสร้าง Version ใหม่",
      });
    }

    await connection.query(
      "DELETE FROM grade_boundaries WHERE grading_scheme_id = ?",
      [schemeId],
    );
    await insertBoundaries(connection, schemeId, validation.boundaries);
    await connection.query(
      `UPDATE grading_schemes
       SET updated_by_admin_id = ?, updated_at = NOW()
       WHERE grading_scheme_id = ?`,
      [instructorId, schemeId],
    );
    await connection.commit();
    return res.json({ message: "บันทึกเกณฑ์ตัดเกรดฉบับร่างสำเร็จ" });
  } catch (error) {
    await connection.rollback();
    console.error("updateInstructorGradingDraft error:", error);
    return res.status(500).json({ message: "ไม่สามารถบันทึกฉบับร่างได้" });
  } finally {
    connection.release();
  }
};

export const publishInstructorGradingScheme = async (
  req: Request,
  res: Response,
) => {
  const instructorId = requireInstructor(req, res);
  if (!instructorId) return;
  const schemeId = positiveId(req.params.schemeId);
  if (!schemeId) {
    return res.status(400).json({ message: "รหัสเกณฑ์ตัดเกรดไม่ถูกต้อง" });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const scheme = await getSchemeAccess(connection, schemeId, instructorId);
    if (!scheme) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบเกณฑ์ตัดเกรด" });
    }
    if (scheme.instructor_role !== "owner") {
      await connection.rollback();
      return res.status(403).json({
        message: "เฉพาะอาจารย์เจ้าของวิชาเท่านั้นที่ Publish เกณฑ์ได้",
      });
    }
    if (scheme.status !== "draft") {
      await connection.rollback();
      return res.status(409).json({ message: "Publish ได้เฉพาะฉบับร่าง" });
    }

    const [boundaryRows] = await connection.query<GradeBoundaryRow[]>(
      `SELECT grade_boundary_id, grading_scheme_id, grade_code,
              minimum_percentage, display_order
       FROM grade_boundaries
       WHERE grading_scheme_id = ?
       ORDER BY display_order
       FOR UPDATE`,
      [schemeId],
    );
    const validation = validateBoundaries(
      boundaryRows.map((boundary) => ({
        grade_code: boundary.grade_code,
        minimum_percentage: Number(boundary.minimum_percentage),
      })),
    );
    if (!validation.valid) {
      await connection.rollback();
      return res.status(400).json({ message: validation.error });
    }

    await connection.query(
      `UPDATE grading_schemes
       SET status = 'archived', updated_by_admin_id = ?, updated_at = NOW()
       WHERE section_id = ? AND status = 'published'
         AND grading_scheme_id <> ?`,
      [instructorId, scheme.section_id, schemeId],
    );
    const [result] = await connection.query<ResultSetHeader>(
      `UPDATE grading_schemes
       SET status = 'published', published_by_admin_id = ?,
           published_at = NOW(), updated_by_admin_id = ?, updated_at = NOW()
       WHERE grading_scheme_id = ? AND status = 'draft'`,
      [instructorId, instructorId, schemeId],
    );
    if (result.affectedRows !== 1) {
      await connection.rollback();
      return res.status(409).json({ message: "สถานะฉบับร่างมีการเปลี่ยนแปลง" });
    }

    await connection.commit();
    return res.json({
      message: `Publish เกณฑ์ตัดเกรด Version ${scheme.version} สำเร็จ`,
      version: Number(scheme.version),
    });
  } catch (error) {
    await connection.rollback();
    console.error("publishInstructorGradingScheme error:", error);
    return res.status(500).json({ message: "ไม่สามารถ Publish เกณฑ์ได้" });
  } finally {
    connection.release();
  }
};
