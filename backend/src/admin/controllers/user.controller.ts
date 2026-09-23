import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import db from "../../config/db";

interface ManagedUserRow extends RowDataPacket {
  user_id: number;
  user_name: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id: number;
  department_code: string;
  department_name: string;
  faculty_id: number;
  faculty_code: string;
  faculty_name: string;
  year_level: number | null;
  user_pic: string | null;
  user_birthdate: Date | null;
  user_gender: "male" | "female" | "other" | "unspecified";
  status: "active" | "suspended" | "archived";
  last_login: Date | null;
  is_inactive: 0 | 1;
  inactive_days: number | null;
  version: string;
}

interface ManagedInstructorRow extends RowDataPacket {
  admin_id: number;
  admin_name: string;
  first_name: string;
  last_name: string;
  admin_email: string;
  phone: string | null;
  address: string | null;
  department_id: number | null;
  department_code: string | null;
  department_name: string | null;
  faculty_id: number | null;
  faculty_code: string | null;
  faculty_name: string | null;
  status: "active" | "suspended" | "archived";
  last_login: Date | null;
  is_inactive: 0 | 1;
  inactive_days: number | null;
  version: string;
}

interface FacultyFilterRow extends RowDataPacket {
  faculty_id: number;
  faculty_code: string;
  faculty_name: string;
}

interface DepartmentFilterRow extends RowDataPacket {
  department_id: number;
  department_code: string;
  department_name: string;
  faculty_id: number;
}

interface UserPictureRow extends RowDataPacket {
  user_pic: string | null;
}

const managedStudentSelect = `SELECT
  u.user_id,
  u.user_name,
  u.first_name,
  u.last_name,
  u.email,
  u.department_id,
  d.department_code,
  d.department_name,
  f.faculty_id,
  f.faculty_code,
  f.faculty_name,
  (
    SELECT st.year_level
    FROM student_terms st
    WHERE st.user_id = u.user_id
    ORDER BY (st.status = 'active') DESC, st.student_term_id DESC
    LIMIT 1
  ) AS year_level,
  u.user_pic,
  u.birthdate AS user_birthdate,
  u.gender AS user_gender,
  u.status,
  u.last_login,
  DATE_FORMAT(u.updated_at, '%Y-%m-%d %H:%i:%s.%f') AS version,
  CASE
    WHEN u.last_login IS NULL OR u.last_login < DATE_SUB(NOW(), INTERVAL 1 YEAR)
    THEN 1 ELSE 0
  END AS is_inactive,
  CASE
    WHEN u.last_login IS NULL THEN NULL
    ELSE TIMESTAMPDIFF(DAY, u.last_login, NOW())
  END AS inactive_days
FROM user u
INNER JOIN departments d ON d.department_id = u.department_id
INNER JOIN faculties f ON f.faculty_id = d.faculty_id`;

const managedInstructorSelect = `SELECT
  a.admin_id,
  a.admin_name,
  a.first_name,
  a.last_name,
  a.admin_email,
  a.phone,
  a.address,
  a.department_id,
  d.department_code,
  d.department_name,
  f.faculty_id,
  f.faculty_code,
  f.faculty_name,
  a.status,
  a.last_login,
  DATE_FORMAT(a.updated_at, '%Y-%m-%d %H:%i:%s.%f') AS version,
  CASE
    WHEN a.last_login IS NULL OR a.last_login < DATE_SUB(NOW(), INTERVAL 1 YEAR)
    THEN 1 ELSE 0
  END AS is_inactive,
  CASE
    WHEN a.last_login IS NULL THEN NULL
    ELSE TIMESTAMPDIFF(DAY, a.last_login, NOW())
  END AS inactive_days
FROM admin a
LEFT JOIN departments d ON d.department_id = a.department_id
LEFT JOIN faculties f ON f.faculty_id = d.faculty_id`;

const isAdmin = (req: Request, res: Response): boolean => {
  if (!req.user?.id) {
    res.status(401).json({ message: "Unauthorized: Missing admin ID" });
    return false;
  }

  if (req.user.role !== "university_staff") {
    res.status(403).json({ message: "Forbidden: Admin access required" });
    return false;
  }

  return true;
};

const parseUserId = (req: Request, res: Response): number | null => {
  const userId = Number(req.params.userId);

  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(400).json({ message: "Invalid user ID" });
    return null;
  }

  return userId;
};

const parseInstructorId = (req: Request, res: Response): number | null => {
  const instructorId = Number(req.params.instructorId);

  if (!Number.isInteger(instructorId) || instructorId <= 0) {
    res.status(400).json({ message: "Invalid instructor ID" });
    return null;
  }

  return instructorId;
};

export const getManagedUsers = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;

    const [users] = await db.query<ManagedUserRow[]>(
      `${managedStudentSelect}
       ORDER BY is_inactive DESC, u.user_id ASC`,
    );
    const [instructors] = await db.query<ManagedInstructorRow[]>(
      `${managedInstructorSelect}
       WHERE a.role = 'instructor'
       ORDER BY is_inactive DESC, a.admin_id ASC`,
    );
    const [faculties] = await db.query<FacultyFilterRow[]>(
      `SELECT faculty_id, faculty_code, faculty_name
       FROM faculties
       ORDER BY faculty_name ASC`,
    );
    const [departments] = await db.query<DepartmentFilterRow[]>(
      `SELECT department_id, department_code, department_name, faculty_id
       FROM departments
       ORDER BY department_name ASC`,
    );

    res.json({
      message: "Users retrieved successfully",
      users: users.map((user) => ({
        ...user,
        is_inactive: Boolean(user.is_inactive),
      })),
      instructors: instructors.map((instructor) => ({
        ...instructor,
        is_inactive: Boolean(instructor.is_inactive),
      })),
      faculties,
      departments,
    });
  } catch (error) {
    console.error("getManagedUsers error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateManagedUser = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;

    const userId = parseUserId(req, res);
    if (!userId) return;

    const { department_id, version } = req.body;
    const departmentId = Number(department_id);

    if (
      typeof version !== "string" ||
      !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(version)
    ) {
      return res.status(400).json({ message: "A valid user version is required" });
    }

    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      return res.status(400).json({ message: "A valid department is required" });
    }

    const [departments] = await db.query<RowDataPacket[]>(
      `SELECT d.department_id
       FROM departments d
       INNER JOIN faculties f ON f.faculty_id = d.faculty_id
       WHERE d.department_id = ?
       LIMIT 1`,
      [departmentId],
    );
    if (departments.length === 0) {
      return res.status(400).json({ message: "Department not found" });
    }

    const [result] = await db.query<ResultSetHeader>(
      `UPDATE user
       SET department_id = ?
       WHERE user_id = ?
         AND updated_at = STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s.%f')`,
      [departmentId, userId, version],
    );

    if (result.affectedRows === 0) {
      const [currentUsers] = await db.query<ManagedUserRow[]>(
        `SELECT
          user_id,
          DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s.%f') AS version
        FROM user
        WHERE user_id = ?
        LIMIT 1`,
        [userId],
      );

      if (currentUsers.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      if (currentUsers[0].version !== version) {
        return res.status(409).json({
          code: "EDIT_CONFLICT",
          message:
            "ข้อมูลผู้ใช้นี้ถูกแก้ไขโดยผู้ดูแลระบบคนอื่นแล้ว กรุณาปิดหน้าต่างและเปิดใหม่เพื่อตรวจสอบข้อมูลล่าสุด",
        });
      }
    }

    const [updatedUsers] = await db.query<ManagedUserRow[]>(
      `${managedStudentSelect}
      WHERE u.user_id = ?
      LIMIT 1`,
      [userId],
    );

    const updatedUser = updatedUsers[0];
    res.json({
      message: "User updated successfully",
      user: {
        ...updatedUser,
        is_inactive: Boolean(updatedUser.is_inactive),
      },
    });
  } catch (error) {
    console.error("updateManagedUser error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateManagedInstructor = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;

    const instructorId = parseInstructorId(req, res);
    if (!instructorId) return;

    const {
      admin_name,
      admin_email,
      first_name,
      last_name,
      phone,
      address,
      department_id,
      version,
    } = req.body;
    const normalizedName = String(admin_name ?? "").trim();
    const normalizedEmail = String(admin_email ?? "").trim().toLowerCase();
    const normalizedFirstName = String(first_name ?? "").trim();
    const normalizedLastName = String(last_name ?? "").trim();
    const normalizedPhone = String(phone ?? "").trim() || null;
    const normalizedAddress = String(address ?? "").trim() || null;
    const departmentId = Number(department_id);

    if (
      typeof version !== "string" ||
      !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(version)
    ) {
      return res.status(400).json({ message: "A valid instructor version is required" });
    }

    if (!/^(?=.*[a-zA-Z])[a-zA-Z0-9]{3,50}$/.test(normalizedName)) {
      return res.status(400).json({
        message:
          "Username must be 3-50 characters, contain a letter, and use only letters or numbers",
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || normalizedEmail.length > 255) {
      return res.status(400).json({ message: "Invalid email" });
    }

    if (
      !normalizedFirstName ||
      !normalizedLastName ||
      normalizedFirstName.length > 100 ||
      normalizedLastName.length > 100
    ) {
      return res.status(400).json({ message: "First name and last name are required" });
    }

    if (
      (normalizedPhone && normalizedPhone.length > 20) ||
      (normalizedAddress && normalizedAddress.length > 255)
    ) {
      return res.status(400).json({ message: "Phone or address is too long" });
    }

    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      return res.status(400).json({ message: "A valid department is required" });
    }

    const [departments] = await db.query<RowDataPacket[]>(
      "SELECT department_id FROM departments WHERE department_id = ? LIMIT 1",
      [departmentId],
    );
    if (departments.length === 0) {
      return res.status(400).json({ message: "Department not found" });
    }

    const [duplicates] = await db.query<RowDataPacket[]>(
      `SELECT admin_id
       FROM admin
       WHERE admin_id <> ?
         AND (BINARY admin_name = ? OR LOWER(admin_email) = ?)
       LIMIT 1`,
      [instructorId, normalizedName, normalizedEmail],
    );
    if (duplicates.length > 0) {
      return res.status(409).json({ message: "Username or email already exists" });
    }

    const [result] = await db.query<ResultSetHeader>(
      `UPDATE admin
       SET admin_name = ?, admin_email = ?, first_name = ?, last_name = ?,
           phone = ?, address = ?, department_id = ?
       WHERE admin_id = ?
         AND role = 'instructor'
         AND updated_at = STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s.%f')`,
      [
        normalizedName,
        normalizedEmail,
        normalizedFirstName,
        normalizedLastName,
        normalizedPhone,
        normalizedAddress,
        departmentId,
        instructorId,
        version,
      ],
    );

    if (result.affectedRows === 0) {
      const [currentInstructors] = await db.query<ManagedInstructorRow[]>(
        `SELECT admin_id,
                DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s.%f') AS version
         FROM admin
         WHERE admin_id = ? AND role = 'instructor'
         LIMIT 1`,
        [instructorId],
      );
      if (currentInstructors.length === 0) {
        return res.status(404).json({ message: "Instructor not found" });
      }
      if (currentInstructors[0].version !== version) {
        return res.status(409).json({
          code: "EDIT_CONFLICT",
          message:
            "ข้อมูลอาจารย์นี้ถูกแก้ไขโดยผู้ดูแลระบบคนอื่นแล้ว กรุณาปิดหน้าต่างและเปิดใหม่เพื่อตรวจสอบข้อมูลล่าสุด",
        });
      }
    }

    const [updatedInstructors] = await db.query<ManagedInstructorRow[]>(
      `${managedInstructorSelect}
       WHERE a.admin_id = ? AND a.role = 'instructor'
       LIMIT 1`,
      [instructorId],
    );
    const updatedInstructor = updatedInstructors[0];
    res.json({
      message: "Instructor updated successfully",
      instructor: {
        ...updatedInstructor,
        is_inactive: Boolean(updatedInstructor.is_inactive),
      },
    });
  } catch (error) {
    console.error("updateManagedInstructor error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteManagedInstructor = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;

    const instructorId = parseInstructorId(req, res);
    if (!instructorId) return;

    const [result] = await db.query<ResultSetHeader>(
      "DELETE FROM admin WHERE admin_id = ? AND role = 'instructor'",
      [instructorId],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Instructor not found" });
    }

    res.json({ message: "Instructor deleted successfully" });
  } catch (error) {
    const databaseError = error as { code?: string };
    if (databaseError.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message:
          "ไม่สามารถลบบัญชีอาจารย์นี้ได้ เนื่องจากยังเชื่อมกับรายวิชา คลังข้อสอบ หรือข้อมูลทางการศึกษาอื่น",
      });
    }
    console.error("deleteManagedInstructor error:", error);
    res.status(500).json({ message: "Unable to delete instructor" });
  }
};

export const deleteManagedUser = async (req: Request, res: Response) => {
  if (!isAdmin(req, res)) return;

  const userId = parseUserId(req, res);
  if (!userId) return;

  const connection = await db.getConnection();
  let userPicture: string | null = null;

  try {
    await connection.beginTransaction();

    const [users] = await connection.query<UserPictureRow[]>(
      "SELECT user_pic FROM user WHERE user_id = ? LIMIT 1 FOR UPDATE",
      [userId],
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    userPicture = users[0].user_pic;

    await connection.query(
      `DELETE block FROM weekly_schedule_block block
       INNER JOIN weekly_recommendation recommendation
         ON recommendation.recommendation_id = block.recommendation_id
       INNER JOIN student_terms student_term
         ON student_term.student_term_id = recommendation.student_term_id
       WHERE student_term.user_id = ?`,
      [userId],
    );
    await connection.query(
      `DELETE recommendation FROM weekly_recommendation recommendation
       INNER JOIN student_terms student_term
         ON student_term.student_term_id = recommendation.student_term_id
       WHERE student_term.user_id = ?`,
      [userId],
    );
    await connection.query(
      `DELETE session FROM study_sessions session
       INNER JOIN enrollments enrollment
         ON enrollment.enrollment_id = session.enrollment_id
       INNER JOIN student_terms student_term
         ON student_term.student_term_id = enrollment.student_term_id
       WHERE student_term.user_id = ?`,
      [userId],
    );
    await connection.query(
      `DELETE checkpoint FROM exam_checkpoints checkpoint
       INNER JOIN enrollments enrollment
         ON enrollment.enrollment_id = checkpoint.enrollment_id
       INNER JOIN student_terms student_term
         ON student_term.student_term_id = enrollment.student_term_id
       WHERE student_term.user_id = ?`,
      [userId],
    );
    await connection.query(
      `DELETE attempt FROM exam_attempts attempt
       INNER JOIN enrollments enrollment
         ON enrollment.enrollment_id = attempt.enrollment_id
       INNER JOIN student_terms student_term
         ON student_term.student_term_id = enrollment.student_term_id
       WHERE student_term.user_id = ?`,
      [userId],
    );
    await connection.query(
      `DELETE workload FROM workloads workload
       INNER JOIN enrollments enrollment
         ON enrollment.enrollment_id = workload.enrollment_id
       INNER JOIN student_terms student_term
         ON student_term.student_term_id = enrollment.student_term_id
       WHERE student_term.user_id = ?`,
      [userId],
    );
    await connection.query(
      `DELETE enrollment FROM enrollments enrollment
       INNER JOIN student_terms student_term
         ON student_term.student_term_id = enrollment.student_term_id
       WHERE student_term.user_id = ?`,
      [userId],
    );
    await connection.query("DELETE FROM student_terms WHERE user_id = ?", [userId]);
    await connection.query("DELETE FROM user WHERE user_id = ?", [userId]);

    await connection.commit();

    if (userPicture) {
      const picturePath = path.join(__dirname, "../../uploads", userPicture);
      fs.promises.unlink(picturePath).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") {
          console.error("deleteManagedUser profile image error:", error);
        }
      });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("deleteManagedUser error:", error);
    res.status(500).json({ message: "Unable to delete user" });
  } finally {
    connection.release();
  }
};
