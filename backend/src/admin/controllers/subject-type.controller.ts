import { Request, Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import db from "../../config/db";

interface ManagedSubjectTypeRow extends RowDataPacket {
  subject_type_id: number;
  subject_type_name: string;
  subject_count: number;
}

const isAdmin = (req: Request, res: Response): boolean => {
  if (!req.user?.id) {
    res.status(401).json({ message: "Unauthorized: Missing admin ID" });
    return false;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({ message: "Forbidden: Admin access required" });
    return false;
  }

  return true;
};

const parseSubjectTypeId = (req: Request, res: Response): number | null => {
  const subjectTypeId = Number(req.params.subjectTypeId);
  if (!Number.isInteger(subjectTypeId) || subjectTypeId <= 0) {
    res.status(400).json({ message: "รหัสประเภทวิชาไม่ถูกต้อง" });
    return null;
  }
  return subjectTypeId;
};

const normalizeName = (value: unknown): string =>
  String(value ?? "").trim().replace(/\s+/g, " ");

const validateName = (value: unknown): { name?: string; message?: string } => {
  const name = normalizeName(value);
  if (!name || name.length > 100) {
    return { message: "ชื่อประเภทวิชาต้องมีความยาว 1-100 ตัวอักษร" };
  }
  return { name };
};

const getSubjectTypeById = async (
  subjectTypeId: number,
): Promise<ManagedSubjectTypeRow | undefined> => {
  const [rows] = await db.query<ManagedSubjectTypeRow[]>(
    `SELECT
      st.subject_type_id,
      st.subject_type_name,
      COUNT(s.subject_id) AS subject_count
     FROM subject_types st
     LEFT JOIN subjects s ON s.subject_type_id = st.subject_type_id
     WHERE st.subject_type_id = ?
     GROUP BY st.subject_type_id, st.subject_type_name
     LIMIT 1`,
    [subjectTypeId],
  );
  return rows[0];
};

export const getSubjectTypes = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;

    const [subjectTypes] = await db.query<ManagedSubjectTypeRow[]>(
      `SELECT
        st.subject_type_id,
        st.subject_type_name,
        COUNT(s.subject_id) AS subject_count
       FROM subject_types st
       LEFT JOIN subjects s ON s.subject_type_id = st.subject_type_id
       GROUP BY st.subject_type_id, st.subject_type_name
       ORDER BY st.subject_type_id ASC`,
    );

    res.json({
      message: "Subject types retrieved successfully",
      subject_types: subjectTypes,
    });
  } catch (error) {
    console.error("getSubjectTypes error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createSubjectType = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;

    const validation = validateName(req.body.subject_type_name);
    if (!validation.name) {
      return res.status(400).json({ message: validation.message });
    }

    const [duplicates] = await db.query<RowDataPacket[]>(
      "SELECT subject_type_id FROM subject_types WHERE subject_type_name = ? LIMIT 1",
      [validation.name],
    );
    if (duplicates.length > 0) {
      return res.status(409).json({ message: "ชื่อประเภทวิชานี้มีอยู่ในระบบแล้ว" });
    }

    const [result] = await db.query<ResultSetHeader>(
      "INSERT INTO subject_types (subject_type_name) VALUES (?)",
      [validation.name],
    );
    const subjectType = await getSubjectTypeById(result.insertId);

    res.status(201).json({
      message: "Subject type created successfully",
      subject_type: subjectType,
    });
  } catch (error) {
    console.error("createSubjectType error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateSubjectType = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;

    const subjectTypeId = parseSubjectTypeId(req, res);
    if (!subjectTypeId) return;

    const validation = validateName(req.body.subject_type_name);
    if (!validation.name) {
      return res.status(400).json({ message: validation.message });
    }

    const existing = await getSubjectTypeById(subjectTypeId);
    if (!existing) {
      return res.status(404).json({ message: "ไม่พบประเภทวิชาที่ต้องการแก้ไข" });
    }

    const [duplicates] = await db.query<RowDataPacket[]>(
      `SELECT subject_type_id
       FROM subject_types
       WHERE subject_type_name = ? AND subject_type_id <> ?
       LIMIT 1`,
      [validation.name, subjectTypeId],
    );
    if (duplicates.length > 0) {
      return res.status(409).json({ message: "ชื่อประเภทวิชานี้มีอยู่ในระบบแล้ว" });
    }

    await db.query<ResultSetHeader>(
      "UPDATE subject_types SET subject_type_name = ? WHERE subject_type_id = ?",
      [validation.name, subjectTypeId],
    );
    const updatedSubjectType = await getSubjectTypeById(subjectTypeId);

    res.json({
      message: "Subject type updated successfully",
      subject_type: updatedSubjectType,
    });
  } catch (error) {
    console.error("updateSubjectType error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteSubjectType = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;

    const subjectTypeId = parseSubjectTypeId(req, res);
    if (!subjectTypeId) return;

    const subjectType = await getSubjectTypeById(subjectTypeId);
    if (!subjectType) {
      return res.status(404).json({ message: "ไม่พบประเภทวิชาที่ต้องการลบ" });
    }

    if (Number(subjectType.subject_count) > 0) {
      return res.status(409).json({
        message: "ไม่สามารถลบประเภทวิชานี้ได้ เพราะยังมีวิชาที่ใช้งานประเภทนี้อยู่",
        subject_count: Number(subjectType.subject_count),
      });
    }

    await db.query<ResultSetHeader>(
      "DELETE FROM subject_types WHERE subject_type_id = ?",
      [subjectTypeId],
    );

    res.json({ message: "Subject type deleted successfully" });
  } catch (error) {
    console.error("deleteSubjectType error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
