import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import db from "../config/db";

export const FIXED_SUBJECT_TYPE_NAMES = [
  "ทฤษฎี",
  "ปฏิบัติ",
  "ทฤษฎีร่วมกับปฏิบัติ",
] as const;

type DatabaseConnection = PoolConnection | typeof db;

interface SubjectTypeIdRow extends RowDataPacket {
  subject_type_id: number;
}

export const ensureFixedSubjectTypes = async (
  adminId: number,
  connection: DatabaseConnection = db,
) => {
  for (const subjectTypeName of FIXED_SUBJECT_TYPE_NAMES) {
    const [existing] = await connection.query<SubjectTypeIdRow[]>(
      `SELECT subject_type_id
       FROM subject_types
       WHERE subject_type_name = ?
       LIMIT 1`,
      [subjectTypeName],
    );

    if (existing.length === 0) {
      await connection.query(
        `INSERT INTO subject_types
          (subject_type_name, is_active, created_by_admin_id)
         VALUES (?, 1, ?)`,
        [subjectTypeName, adminId],
      );
    } else {
      await connection.query(
        `UPDATE subject_types
         SET is_active = 1
         WHERE subject_type_id = ?`,
        [existing[0].subject_type_id],
      );
    }
  }

  await connection.query(
    `UPDATE subject_types
     SET is_active = 0
     WHERE subject_type_name NOT IN (?, ?, ?)`,
    [...FIXED_SUBJECT_TYPE_NAMES],
  );
};
