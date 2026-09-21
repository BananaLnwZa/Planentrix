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

export const getManagedUsers = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req, res)) return;

    const [users] = await db.query<ManagedUserRow[]>(
      `${managedStudentSelect}
       ORDER BY is_inactive DESC, u.user_id ASC`,
    );
    const [instructors] = await db.query<ManagedInstructorRow[]>(
      `SELECT
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
       LEFT JOIN faculties f ON f.faculty_id = d.faculty_id
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

    const { user_name, user_birthdate, user_gender, version } = req.body;
    const normalizedUserName = String(user_name ?? "").trim();
    const usernameRegex = /^(?=.*[a-zA-Z])[a-zA-Z0-9]{3,50}$/;

    if (
      typeof version !== "string" ||
      !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(version)
    ) {
      return res.status(400).json({ message: "A valid user version is required" });
    }

    if (!usernameRegex.test(normalizedUserName)) {
      return res.status(400).json({
        message:
          "Username must be 3-50 characters, contain a letter, and use only letters or numbers",
      });
    }

    if (!["male", "female", "other", "unspecified"].includes(user_gender)) {
      return res.status(400).json({ message: "Invalid gender" });
    }

    if (user_birthdate !== null && user_birthdate !== "") {
      const birthdateValue = String(user_birthdate);
      const parsedBirthdate = new Date(`${birthdateValue}T00:00:00.000Z`);
      const today = new Date().toISOString().slice(0, 10);

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(birthdateValue) ||
        Number.isNaN(parsedBirthdate.getTime()) ||
        parsedBirthdate.toISOString().slice(0, 10) !== birthdateValue ||
        birthdateValue > today
      ) {
        return res.status(400).json({ message: "Invalid birthdate" });
      }
    }

    const [duplicateRows] = await db.query<RowDataPacket[]>(
      "SELECT user_id FROM user WHERE BINARY user_name = ? AND user_id <> ? LIMIT 1",
      [normalizedUserName, userId],
    );

    if (duplicateRows.length > 0) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const [result] = await db.query<ResultSetHeader>(
      `UPDATE user
       SET user_name = ?, birthdate = ?, gender = ?
       WHERE user_id = ?
         AND updated_at = STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s.%f')`,
      [
        normalizedUserName,
        user_birthdate || null,
        user_gender,
        userId,
        version,
      ],
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
      `DELETE psh FROM part_score_history psh
       INNER JOIN exam_score_history esh
         ON esh.exam_score_history_id = psh.exam_score_history_id
       INNER JOIN schedule_time st
         ON st.schedule_time_id = esh.schedule_time_id
       WHERE st.user_id = ?`,
      [userId],
    );
    await connection.query(
      `DELETE esh FROM exam_score_history esh
       INNER JOIN schedule_time st
         ON st.schedule_time_id = esh.schedule_time_id
       WHERE st.user_id = ?`,
      [userId],
    );
    await connection.query(
      `DELETE sc FROM score sc
       INNER JOIN workloads w ON w.workload_id = sc.workload_id
       INNER JOIN schedule_time st ON st.schedule_time_id = w.schedule_time_id
       WHERE st.user_id = ?`,
      [userId],
    );
    await connection.query(
      `DELETE w FROM workloads w
       INNER JOIN schedule_time st ON st.schedule_time_id = w.schedule_time_id
       WHERE st.user_id = ?`,
      [userId],
    );
    await connection.query(
      `DELETE study FROM study_time study
       INNER JOIN schedule_time st
         ON st.schedule_time_id = study.schedule_time_id
       WHERE st.user_id = ?`,
      [userId],
    );
    await connection.query("DELETE FROM schedule_time WHERE user_id = ?", [userId]);
    await connection.query("DELETE FROM terms WHERE user_id = ?", [userId]);
    await connection.query("DELETE FROM `constraint` WHERE user_id = ?", [userId]);
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
