import type { Request, Response } from "express";
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import db from "../../config/db";
import {
  DEFAULT_GRADE_BOUNDARIES,
  GRADE_CODES,
  insertGradeBoundaries,
  type GradeBoundaryInput,
  type GradeCode,
} from "../../services/gradingScheme.service";

interface GradingSubjectRow extends RowDataPacket {
  subject_id: string;
  subject_name: string;
  section_count: number;
  can_manage: number | boolean;
  has_draft_term: number | boolean;
  has_active_term: number | boolean;
}

interface GradingSchemeRow extends RowDataPacket {
  grading_scheme_id: number;
  subject_id: string;
  instructor_id: number | null;
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

interface SubjectAccessRow extends RowDataPacket {
  subject_id: string;
}

type SchemeAccessRow = GradingSchemeRow;

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
):
  | { valid: true; boundaries: GradeBoundaryInput[] }
  | { valid: false; error: string } => {
  if (!Array.isArray(value) || value.length !== GRADE_CODES.length) {
    return { valid: false, error: "กรุณากำหนดคะแนนขั้นต่ำให้ครบทุกเกรด A ถึง F" };
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

  const boundaries = GRADE_CODES.map((gradeCode, index) => ({
    grade_code: gradeCode,
    minimum_percentage: byCode.get(gradeCode) as number,
    display_order: index + 1,
  }));
  if (boundaries[boundaries.length - 1].minimum_percentage !== 0) {
    return { valid: false, error: "คะแนนขั้นต่ำของเกรด F ต้องเป็น 0" };
  }
  for (let index = 1; index < boundaries.length; index += 1) {
    if (boundaries[index - 1].minimum_percentage <= boundaries[index].minimum_percentage) {
      return {
        valid: false,
        error: `คะแนนขั้นต่ำของเกรด ${boundaries[index - 1].grade_code} ต้องมากกว่าเกรด ${boundaries[index].grade_code}`,
      };
    }
  }
  return { valid: true, boundaries };
};

const serializeScheme = (
  scheme: GradingSchemeRow,
  boundaries: GradeBoundaryRow[],
) => ({
  ...scheme,
  grading_scheme_id: Number(scheme.grading_scheme_id),
  instructor_id: scheme.instructor_id === null ? null : Number(scheme.instructor_id),
  source_scheme_id: scheme.source_scheme_id === null ? null : Number(scheme.source_scheme_id),
  version: Number(scheme.version),
  boundaries: boundaries.map((boundary) => ({
    grade_boundary_id: Number(boundary.grade_boundary_id),
    grading_scheme_id: Number(boundary.grading_scheme_id),
    grade_code: boundary.grade_code,
    minimum_percentage: Number(boundary.minimum_percentage),
    display_order: Number(boundary.display_order),
  })),
});

const getSubjectAccess = async (
  connection: PoolConnection,
  subjectId: string,
  instructorId: number,
): Promise<SubjectAccessRow | undefined> => {
  const [rows] = await connection.query<SubjectAccessRow[]>(
    `SELECT subject.subject_id
     FROM subjects subject
     WHERE BINARY subject.subject_id = ?
       AND subject.is_active = 1
       AND EXISTS (
         SELECT 1
         FROM course_sections section
         INNER JOIN section_instructors assignment
           ON assignment.section_id = section.section_id
         INNER JOIN academic_terms term
           ON term.academic_term_id = section.academic_term_id
         WHERE section.subject_id = subject.subject_id
           AND assignment.instructor_id = ?
           AND assignment.instructor_role = 'owner'
           AND section.status IN ('draft', 'open', 'closed')
           AND term.status IN ('draft', 'active')
       )
     LIMIT 1
     FOR UPDATE`,
    [subjectId, instructorId],
  );
  return rows[0];
};

const getSchemeAccess = async (
  connection: PoolConnection,
  schemeId: number,
  instructorId: number,
): Promise<SchemeAccessRow | undefined> => {
  const [rows] = await connection.query<SchemeAccessRow[]>(
    `SELECT scheme.grading_scheme_id, scheme.subject_id, scheme.instructor_id,
            scheme.source_scheme_id, scheme.version, scheme.status,
            scheme.created_by_admin_id, scheme.updated_by_admin_id,
            scheme.published_by_admin_id, scheme.published_at,
            scheme.created_at, scheme.updated_at
     FROM grading_schemes scheme
     WHERE scheme.grading_scheme_id = ?
       AND scheme.scheme_type = 'instructor_subject'
       AND scheme.instructor_id = ?
       AND EXISTS (
         SELECT 1
         FROM course_sections section
         INNER JOIN section_instructors assignment
           ON assignment.section_id = section.section_id
         INNER JOIN academic_terms term
           ON term.academic_term_id = section.academic_term_id
         INNER JOIN subjects subject
           ON subject.subject_id = section.subject_id AND subject.is_active = 1
         WHERE section.subject_id = scheme.subject_id
           AND assignment.instructor_id = ?
           AND assignment.instructor_role = 'owner'
           AND section.status IN ('draft', 'open', 'closed')
           AND term.status IN ('draft', 'active')
       )
     LIMIT 1
     FOR UPDATE`,
    [schemeId, instructorId, instructorId],
  );
  return rows[0];
};

export const getInstructorGradingWorkspace = async (req: Request, res: Response) => {
  const instructorId = requireInstructor(req, res);
  if (!instructorId) return;

  try {
    const [subjects] = await db.query<GradingSubjectRow[]>(
      `SELECT subject.subject_id, subject.subject_name,
              COUNT(DISTINCT section.section_id) AS section_count,
              TRUE AS can_manage,
              MAX(term.status = 'draft') AS has_draft_term,
              MAX(term.status = 'active') AS has_active_term
       FROM section_instructors assignment
       INNER JOIN course_sections section ON section.section_id = assignment.section_id
       INNER JOIN academic_terms term
         ON term.academic_term_id = section.academic_term_id
       INNER JOIN subjects subject
         ON subject.subject_id = section.subject_id AND subject.is_active = 1
       WHERE assignment.instructor_id = ?
         AND assignment.instructor_role = 'owner'
         AND section.status IN ('draft', 'open', 'closed')
         AND term.status IN ('draft', 'active')
       GROUP BY subject.subject_id, subject.subject_name
       ORDER BY subject.subject_name, subject.subject_id`,
      [instructorId],
    );

    const [schemes] = await db.query<GradingSchemeRow[]>(
      `SELECT grading_scheme_id, subject_id, instructor_id, source_scheme_id,
              version, status, created_by_admin_id, updated_by_admin_id,
              published_by_admin_id, published_at, created_at, updated_at
       FROM grading_schemes
       WHERE instructor_id = ? AND scheme_type = 'instructor_subject'
         AND EXISTS (
           SELECT 1
           FROM course_sections section
           INNER JOIN section_instructors assignment
             ON assignment.section_id = section.section_id
           INNER JOIN academic_terms term
             ON term.academic_term_id = section.academic_term_id
           INNER JOIN subjects subject
             ON subject.subject_id = section.subject_id AND subject.is_active = 1
           WHERE section.subject_id = grading_schemes.subject_id
             AND assignment.instructor_id = ?
             AND assignment.instructor_role = 'owner'
             AND section.status IN ('draft', 'open', 'closed')
             AND term.status IN ('draft', 'active')
         )
       ORDER BY subject_id, version DESC, grading_scheme_id DESC`,
      [instructorId, instructorId],
    );

    const [boundaries] = await db.query<GradeBoundaryRow[]>(
      `SELECT boundary.grade_boundary_id, boundary.grading_scheme_id,
              boundary.grade_code, boundary.minimum_percentage,
              boundary.display_order
       FROM grade_boundaries boundary
       INNER JOIN grading_schemes scheme
         ON scheme.grading_scheme_id = boundary.grading_scheme_id
       WHERE scheme.instructor_id = ?
         AND scheme.scheme_type = 'instructor_subject'
         AND EXISTS (
           SELECT 1
           FROM course_sections section
           INNER JOIN section_instructors assignment
             ON assignment.section_id = section.section_id
           INNER JOIN academic_terms term
             ON term.academic_term_id = section.academic_term_id
           INNER JOIN subjects subject
             ON subject.subject_id = section.subject_id AND subject.is_active = 1
           WHERE section.subject_id = scheme.subject_id
             AND assignment.instructor_id = ?
             AND assignment.instructor_role = 'owner'
             AND section.status IN ('draft', 'open', 'closed')
             AND term.status IN ('draft', 'active')
         )
       ORDER BY boundary.grading_scheme_id, boundary.display_order`,
      [instructorId, instructorId],
    );

    const boundariesByScheme = new Map<number, GradeBoundaryRow[]>();
    for (const boundary of boundaries) {
      const schemeId = Number(boundary.grading_scheme_id);
      boundariesByScheme.set(schemeId, [...(boundariesByScheme.get(schemeId) ?? []), boundary]);
    }

    return res.json({
      message: "Instructor grading workspace retrieved successfully",
      subjects: subjects.map((subject) => ({
        ...subject,
        section_count: Number(subject.section_count),
        can_manage: Number(subject.can_manage) === 1,
        has_draft_term: Number(subject.has_draft_term) === 1,
        has_active_term: Number(subject.has_active_term) === 1,
      })),
      grading_schemes: schemes.map((scheme) =>
        serializeScheme(scheme, boundariesByScheme.get(Number(scheme.grading_scheme_id)) ?? []),
      ),
      grade_codes: GRADE_CODES,
    });
  } catch (error) {
    console.error("getInstructorGradingWorkspace error:", error);
    return res.status(500).json({ message: "ไม่สามารถโหลดเกณฑ์ตัดเกรดได้" });
  }
};

export const createInstructorGradingDraft = async (req: Request, res: Response) => {
  const instructorId = requireInstructor(req, res);
  if (!instructorId) return;
  const subjectId = String(req.body.subject_id ?? "").trim();
  if (!subjectId || subjectId.length > 20) {
    return res.status(400).json({ message: "รหัสรายวิชาไม่ถูกต้อง" });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const access = await getSubjectAccess(connection, subjectId, instructorId);
    if (!access) {
      await connection.rollback();
      return res.status(404).json({
        message: "ไม่พบรายวิชาที่ได้รับมอบหมายในฐานะเจ้าของวิชาของภาคการศึกษาฉบับร่างหรือที่เปิดใช้งาน",
      });
    }

    const [existing] = await connection.query<GradingSchemeRow[]>(
      `SELECT grading_scheme_id, subject_id, instructor_id, source_scheme_id,
              version, status, created_by_admin_id, updated_by_admin_id,
              published_by_admin_id, published_at, created_at, updated_at
       FROM grading_schemes
       WHERE subject_id = ? AND instructor_id = ?
         AND scheme_type = 'instructor_subject'
       ORDER BY version DESC
       FOR UPDATE`,
      [subjectId, instructorId],
    );
    if (existing.some((scheme) => scheme.status === "draft")) {
      await connection.rollback();
      return res.status(409).json({ message: "รายวิชานี้มีฉบับร่างอยู่แล้ว กรุณาแก้ไขฉบับเดิม" });
    }

    const version = existing.reduce((max, scheme) => Math.max(max, Number(scheme.version)), 0) + 1;
    const [defaults] = await connection.query<GradingSchemeRow[]>(
      `SELECT grading_scheme_id, subject_id, instructor_id, source_scheme_id,
              version, status, created_by_admin_id, updated_by_admin_id,
              published_by_admin_id, published_at, created_at, updated_at
       FROM grading_schemes
       WHERE subject_id = ? AND scheme_type = 'subject_default'
         AND status <> 'archived'
       ORDER BY (status = 'published') DESC, version DESC
       LIMIT 1
       FOR UPDATE`,
      [subjectId],
    );
    const source = existing.find((scheme) => scheme.status === "published") ?? existing[0] ?? defaults[0];
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO grading_schemes
        (subject_id, instructor_id, source_scheme_id, scheme_type, version,
         status, created_by_admin_id, updated_by_admin_id)
       VALUES (?, ?, ?, 'instructor_subject', ?, 'draft', ?, ?)`,
      [subjectId, instructorId, source?.grading_scheme_id ?? null, version, instructorId, instructorId],
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
      await insertGradeBoundaries(connection, result.insertId, DEFAULT_GRADE_BOUNDARIES);
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

export const updateInstructorGradingDraft = async (req: Request, res: Response) => {
  const instructorId = requireInstructor(req, res);
  if (!instructorId) return;
  const schemeId = positiveId(req.params.schemeId);
  if (!schemeId) return res.status(400).json({ message: "รหัสเกณฑ์ตัดเกรดไม่ถูกต้อง" });
  const validation = validateBoundaries(req.body.boundaries);
  if (!validation.valid) return res.status(400).json({ message: validation.error });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const scheme = await getSchemeAccess(connection, schemeId, instructorId);
    if (!scheme) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบเกณฑ์ตัดเกรด" });
    }
    if (scheme.status !== "draft") {
      await connection.rollback();
      return res.status(409).json({ message: "แก้ไขได้เฉพาะฉบับร่าง กรุณาสร้าง Version ใหม่" });
    }

    await connection.query("DELETE FROM grade_boundaries WHERE grading_scheme_id = ?", [schemeId]);
    await insertGradeBoundaries(connection, schemeId, validation.boundaries);
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

export const publishInstructorGradingScheme = async (req: Request, res: Response) => {
  const instructorId = requireInstructor(req, res);
  if (!instructorId) return;
  const schemeId = positiveId(req.params.schemeId);
  if (!schemeId) return res.status(400).json({ message: "รหัสเกณฑ์ตัดเกรดไม่ถูกต้อง" });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const scheme = await getSchemeAccess(connection, schemeId, instructorId);
    if (!scheme) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบเกณฑ์ตัดเกรด" });
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
    const validation = validateBoundaries(boundaryRows.map((boundary) => ({
      grade_code: boundary.grade_code,
      minimum_percentage: Number(boundary.minimum_percentage),
    })));
    if (!validation.valid) {
      await connection.rollback();
      return res.status(400).json({ message: validation.error });
    }

    await connection.query(
      `UPDATE grading_schemes
       SET status = 'archived', updated_by_admin_id = ?, updated_at = NOW()
       WHERE subject_id = ? AND instructor_id = ?
         AND scheme_type = 'instructor_subject'
         AND status = 'published' AND grading_scheme_id <> ?`,
      [instructorId, scheme.subject_id, instructorId, schemeId],
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
    return res.json({ message: `Publish เกณฑ์ตัดเกรด Version ${scheme.version} สำเร็จ`, version: Number(scheme.version) });
  } catch (error) {
    await connection.rollback();
    console.error("publishInstructorGradingScheme error:", error);
    return res.status(500).json({ message: "ไม่สามารถ Publish เกณฑ์ได้" });
  } finally {
    connection.release();
  }
};
