import type { Request, Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import db from "../../config/db";

interface FacultyRow extends RowDataPacket {
  faculty_id: number;
  faculty_code: string;
  faculty_name: string;
  is_active: 0 | 1;
  department_count: number;
  active_department_count: number;
}

interface DepartmentRow extends RowDataPacket {
  department_id: number;
  faculty_id: number;
  faculty_code: string;
  faculty_name: string;
  department_code: string;
  department_name: string;
  is_active: 0 | 1;
}

interface FacultyOptionRow extends RowDataPacket {
  faculty_id: number;
  faculty_code: string;
  faculty_name: string;
  is_active: 0 | 1;
}

interface DepartmentIdentityRow extends RowDataPacket {
  department_id: number;
  faculty_id: number;
  faculty_is_active: 0 | 1;
}

const requireAdminId = (req: Request, res: Response): number | null => {
  if (!req.user?.id) {
    res.status(401).json({ message: "Unauthorized: Missing admin ID" });
    return null;
  }
  if (req.user.role !== "university_staff") {
    res.status(403).json({ message: "Forbidden: Admin access required" });
    return null;
  }
  return req.user.id;
};

const codePattern = /^[A-Za-z0-9_-]{1,20}$/;

const normalizeCode = (value: unknown): string =>
  String(value ?? "").trim().toUpperCase();

const normalizeName = (value: unknown): string => String(value ?? "").trim();

const serializeFaculty = (faculty: FacultyRow) => ({
  ...faculty,
  is_active: Boolean(faculty.is_active),
  department_count: Number(faculty.department_count),
  active_department_count: Number(faculty.active_department_count),
});

const serializeDepartment = (department: DepartmentRow) => ({
  ...department,
  is_active: Boolean(department.is_active),
});

const serializeFacultyOption = (faculty: FacultyOptionRow) => ({
  ...faculty,
  is_active: Boolean(faculty.is_active),
});

const parsePositiveId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const isDuplicateEntry = (error: unknown): boolean =>
  Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ER_DUP_ENTRY",
  );

const facultySelect = `SELECT
  f.faculty_id,
  f.faculty_code,
  f.faculty_name,
  f.is_active,
  COUNT(d.department_id) AS department_count,
  SUM(CASE WHEN d.is_active = 1 THEN 1 ELSE 0 END) AS active_department_count
FROM faculties f
LEFT JOIN departments d ON d.faculty_id = f.faculty_id`;

const departmentSelect = `SELECT
  d.department_id,
  d.faculty_id,
  f.faculty_code,
  f.faculty_name,
  d.department_code,
  d.department_name,
  d.is_active
FROM departments d
INNER JOIN faculties f ON f.faculty_id = d.faculty_id`;

export const getFaculties = async (req: Request, res: Response) => {
  try {
    if (requireAdminId(req, res) === null) return;

    const [rows] = await db.query<FacultyRow[]>(
      `${facultySelect}
       GROUP BY f.faculty_id, f.faculty_code, f.faculty_name, f.is_active
       ORDER BY f.faculty_name ASC`,
    );
    res.json({
      message: "Faculties retrieved successfully",
      faculties: rows.map(serializeFaculty),
    });
  } catch (error) {
    console.error("getFaculties error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createFaculty = async (req: Request, res: Response) => {
  const adminId = requireAdminId(req, res);
  if (adminId === null) return;

  const facultyCode = normalizeCode(req.body.faculty_code);
  const facultyName = normalizeName(req.body.faculty_name);
  if (!codePattern.test(facultyCode)) {
    return res.status(400).json({
      message: "ตัวย่อคณะต้องมี 1-20 ตัว และใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข _ หรือ -",
    });
  }
  if (!facultyName || facultyName.length > 150) {
    return res.status(400).json({ message: "ชื่อคณะต้องมีความยาว 1-150 ตัวอักษร" });
  }

  try {
    const [existingRows] = await db.query<RowDataPacket[]>(
      "SELECT faculty_id FROM faculties WHERE faculty_name = ? LIMIT 1",
      [facultyName],
    );
    if (existingRows.length > 0) {
      return res.status(409).json({ message: "ชื่อคณะนี้มีอยู่ในระบบแล้ว" });
    }

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO faculties
        (faculty_code, faculty_name, created_by_admin_id)
       VALUES (?, ?, ?)`,
      [facultyCode, facultyName, adminId],
    );
    const [rows] = await db.query<FacultyRow[]>(
      `${facultySelect}
       WHERE f.faculty_id = ?
       GROUP BY f.faculty_id, f.faculty_code, f.faculty_name, f.is_active
       LIMIT 1`,
      [result.insertId],
    );
    res.status(201).json({
      message: "Faculty created successfully",
      faculty: serializeFaculty(rows[0]),
    });
  } catch (error) {
    if (isDuplicateEntry(error)) {
      return res.status(409).json({ message: "ตัวย่อคณะนี้มีอยู่ในระบบแล้ว" });
    }
    console.error("createFaculty error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateFaculty = async (req: Request, res: Response) => {
  if (requireAdminId(req, res) === null) return;

  const facultyId = parsePositiveId(req.params.facultyId);
  const facultyCode = normalizeCode(req.body.faculty_code);
  const facultyName = normalizeName(req.body.faculty_name);
  if (facultyId === null) {
    return res.status(400).json({ message: "รหัสอ้างอิงคณะไม่ถูกต้อง" });
  }
  if (!codePattern.test(facultyCode)) {
    return res.status(400).json({
      message: "ตัวย่อคณะต้องมี 1-20 ตัว และใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข _ หรือ -",
    });
  }
  if (!facultyName || facultyName.length > 150) {
    return res.status(400).json({ message: "ชื่อคณะต้องมีความยาว 1-150 ตัวอักษร" });
  }

  try {
    const [duplicateRows] = await db.query<RowDataPacket[]>(
      `SELECT faculty_id FROM faculties
       WHERE faculty_name = ? AND faculty_id <> ?
       LIMIT 1`,
      [facultyName, facultyId],
    );
    if (duplicateRows.length > 0) {
      return res.status(409).json({ message: "ชื่อคณะนี้มีอยู่ในระบบแล้ว" });
    }

    const [result] = await db.query<ResultSetHeader>(
      `UPDATE faculties
       SET faculty_code = ?, faculty_name = ?
       WHERE faculty_id = ?`,
      [facultyCode, facultyName, facultyId],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบคณะที่ต้องการแก้ไข" });
    }

    const [rows] = await db.query<FacultyRow[]>(
      `${facultySelect}
       WHERE f.faculty_id = ?
       GROUP BY f.faculty_id, f.faculty_code, f.faculty_name, f.is_active
       LIMIT 1`,
      [facultyId],
    );
    res.json({
      message: "Faculty updated successfully",
      faculty: serializeFaculty(rows[0]),
    });
  } catch (error) {
    if (isDuplicateEntry(error)) {
      return res.status(409).json({ message: "ตัวย่อคณะนี้มีอยู่ในระบบแล้ว" });
    }
    console.error("updateFaculty error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateFacultyStatus = async (req: Request, res: Response) => {
  if (requireAdminId(req, res) === null) return;

  const facultyId = parsePositiveId(req.params.facultyId);
  const isActive = req.body.is_active;
  if (facultyId === null) {
    return res.status(400).json({ message: "รหัสอ้างอิงคณะไม่ถูกต้อง" });
  }
  if (typeof isActive !== "boolean") {
    return res.status(400).json({ message: "สถานะคณะต้องเป็น true หรือ false" });
  }

  try {
    const [rows] = await db.query<FacultyRow[]>(
      `${facultySelect}
       WHERE f.faculty_id = ?
       GROUP BY f.faculty_id, f.faculty_code, f.faculty_name, f.is_active
       LIMIT 1`,
      [facultyId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบคณะที่ต้องการเปลี่ยนสถานะ" });
    }

    const current = serializeFaculty(rows[0]);
    if (!isActive && current.active_department_count > 0) {
      return res.status(409).json({
        message: `ยังปิดคณะนี้ไม่ได้ เพราะมีสาขาที่เปิดใช้งานอยู่ ${current.active_department_count} สาขา`,
        active_department_count: current.active_department_count,
      });
    }

    await db.query<ResultSetHeader>(
      "UPDATE faculties SET is_active = ? WHERE faculty_id = ?",
      [isActive ? 1 : 0, facultyId],
    );
    res.json({
      message: "Faculty status updated successfully",
      faculty: { ...current, is_active: isActive },
    });
  } catch (error) {
    console.error("updateFacultyStatus error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getDepartments = async (req: Request, res: Response) => {
  try {
    if (requireAdminId(req, res) === null) return;

    const [departments] = await db.query<DepartmentRow[]>(
      `${departmentSelect}
       ORDER BY f.faculty_name ASC, d.department_name ASC`,
    );
    const [faculties] = await db.query<FacultyOptionRow[]>(
      `SELECT faculty_id, faculty_code, faculty_name, is_active
       FROM faculties
       ORDER BY faculty_name ASC`,
    );
    res.json({
      message: "Departments retrieved successfully",
      departments: departments.map(serializeDepartment),
      faculties: faculties.map(serializeFacultyOption),
    });
  } catch (error) {
    console.error("getDepartments error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createDepartment = async (req: Request, res: Response) => {
  const adminId = requireAdminId(req, res);
  if (adminId === null) return;

  const facultyId = Number(req.body.faculty_id);
  const departmentCode = normalizeCode(req.body.department_code);
  const departmentName = normalizeName(req.body.department_name);
  if (!Number.isInteger(facultyId) || facultyId <= 0) {
    return res.status(400).json({ message: "กรุณาเลือกคณะ" });
  }
  if (!codePattern.test(departmentCode)) {
    return res.status(400).json({
      message: "ตัวย่อสาขาต้องมี 1-20 ตัว และใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข _ หรือ -",
    });
  }
  if (!departmentName || departmentName.length > 150) {
    return res.status(400).json({ message: "ชื่อสาขาต้องมีความยาว 1-150 ตัวอักษร" });
  }

  try {
    const [facultyRows] = await db.query<RowDataPacket[]>(
      `SELECT faculty_id FROM faculties
       WHERE faculty_id = ? AND is_active = 1
       LIMIT 1`,
      [facultyId],
    );
    if (facultyRows.length === 0) {
      return res.status(400).json({ message: "ไม่พบคณะที่เลือกหรือคณะถูกปิดใช้งาน" });
    }

    const [existingRows] = await db.query<RowDataPacket[]>(
      `SELECT department_id FROM departments
       WHERE faculty_id = ? AND department_name = ?
       LIMIT 1`,
      [facultyId, departmentName],
    );
    if (existingRows.length > 0) {
      return res.status(409).json({ message: "ชื่อสาขานี้มีอยู่ในคณะที่เลือกแล้ว" });
    }

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO departments
        (faculty_id, department_code, department_name, created_by_admin_id)
       VALUES (?, ?, ?, ?)`,
      [facultyId, departmentCode, departmentName, adminId],
    );
    const [rows] = await db.query<DepartmentRow[]>(
      `${departmentSelect} WHERE d.department_id = ? LIMIT 1`,
      [result.insertId],
    );
    res.status(201).json({
      message: "Department created successfully",
      department: serializeDepartment(rows[0]),
    });
  } catch (error) {
    if (isDuplicateEntry(error)) {
      return res.status(409).json({ message: "ตัวย่อสาขานี้มีอยู่ในระบบแล้ว" });
    }
    console.error("createDepartment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateDepartment = async (req: Request, res: Response) => {
  if (requireAdminId(req, res) === null) return;

  const departmentId = parsePositiveId(req.params.departmentId);
  const facultyId = parsePositiveId(req.body.faculty_id);
  const departmentCode = normalizeCode(req.body.department_code);
  const departmentName = normalizeName(req.body.department_name);
  if (departmentId === null) {
    return res.status(400).json({ message: "รหัสอ้างอิงสาขาไม่ถูกต้อง" });
  }
  if (facultyId === null) {
    return res.status(400).json({ message: "กรุณาเลือกคณะ" });
  }
  if (!codePattern.test(departmentCode)) {
    return res.status(400).json({
      message: "ตัวย่อสาขาต้องมี 1-20 ตัว และใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข _ หรือ -",
    });
  }
  if (!departmentName || departmentName.length > 150) {
    return res.status(400).json({ message: "ชื่อสาขาต้องมีความยาว 1-150 ตัวอักษร" });
  }

  try {
    const [departmentRows] = await db.query<DepartmentIdentityRow[]>(
      `SELECT d.department_id, d.faculty_id, f.is_active AS faculty_is_active
       FROM departments d
       INNER JOIN faculties f ON f.faculty_id = d.faculty_id
       WHERE d.department_id = ?
       LIMIT 1`,
      [departmentId],
    );
    if (departmentRows.length === 0) {
      return res.status(404).json({ message: "ไม่พบสาขาที่ต้องการแก้ไข" });
    }

    const [facultyRows] = await db.query<FacultyOptionRow[]>(
      `SELECT faculty_id, faculty_code, faculty_name, is_active
       FROM faculties
       WHERE faculty_id = ?
       LIMIT 1`,
      [facultyId],
    );
    if (facultyRows.length === 0) {
      return res.status(400).json({ message: "ไม่พบคณะที่เลือก" });
    }
    if (
      !facultyRows[0].is_active &&
      facultyId !== departmentRows[0].faculty_id
    ) {
      return res.status(409).json({ message: "ไม่สามารถย้ายสาขาไปยังคณะที่ปิดใช้งานอยู่" });
    }

    const [duplicateRows] = await db.query<RowDataPacket[]>(
      `SELECT department_id FROM departments
       WHERE faculty_id = ? AND department_name = ? AND department_id <> ?
       LIMIT 1`,
      [facultyId, departmentName, departmentId],
    );
    if (duplicateRows.length > 0) {
      return res.status(409).json({ message: "ชื่อสาขานี้มีอยู่ในคณะที่เลือกแล้ว" });
    }

    await db.query<ResultSetHeader>(
      `UPDATE departments
       SET faculty_id = ?, department_code = ?, department_name = ?
       WHERE department_id = ?`,
      [facultyId, departmentCode, departmentName, departmentId],
    );
    const [rows] = await db.query<DepartmentRow[]>(
      `${departmentSelect} WHERE d.department_id = ? LIMIT 1`,
      [departmentId],
    );
    res.json({
      message: "Department updated successfully",
      department: serializeDepartment(rows[0]),
    });
  } catch (error) {
    if (isDuplicateEntry(error)) {
      return res.status(409).json({ message: "ตัวย่อสาขานี้มีอยู่ในระบบแล้ว" });
    }
    console.error("updateDepartment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateDepartmentStatus = async (req: Request, res: Response) => {
  if (requireAdminId(req, res) === null) return;

  const departmentId = parsePositiveId(req.params.departmentId);
  const isActive = req.body.is_active;
  if (departmentId === null) {
    return res.status(400).json({ message: "รหัสอ้างอิงสาขาไม่ถูกต้อง" });
  }
  if (typeof isActive !== "boolean") {
    return res.status(400).json({ message: "สถานะสาขาต้องเป็น true หรือ false" });
  }

  try {
    const [identityRows] = await db.query<DepartmentIdentityRow[]>(
      `SELECT d.department_id, d.faculty_id, f.is_active AS faculty_is_active
       FROM departments d
       INNER JOIN faculties f ON f.faculty_id = d.faculty_id
       WHERE d.department_id = ?
       LIMIT 1`,
      [departmentId],
    );
    if (identityRows.length === 0) {
      return res.status(404).json({ message: "ไม่พบสาขาที่ต้องการเปลี่ยนสถานะ" });
    }
    if (isActive && !identityRows[0].faculty_is_active) {
      return res.status(409).json({
        message: "ยังเปิดสาขานี้ไม่ได้ เพราะคณะที่สังกัดถูกปิดใช้งานอยู่",
      });
    }

    await db.query<ResultSetHeader>(
      "UPDATE departments SET is_active = ? WHERE department_id = ?",
      [isActive ? 1 : 0, departmentId],
    );
    const [rows] = await db.query<DepartmentRow[]>(
      `${departmentSelect} WHERE d.department_id = ? LIMIT 1`,
      [departmentId],
    );
    res.json({
      message: "Department status updated successfully",
      department: serializeDepartment(rows[0]),
    });
  } catch (error) {
    console.error("updateDepartmentStatus error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
