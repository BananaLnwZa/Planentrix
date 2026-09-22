import { Request, Response } from "express";
import db from "../../config/db";
import path from "path";
import multer from "multer";
import fs from "fs";
import { safelyGenerateRecommendation } from "../services/recommendation.engine";
import { validateConstraintForSave } from "../services/constraint-validation";
import {
  constraintDayToDatabase,
  constraintDayToNumber,
} from "../services/constraint-day";

// ==============================
// ฟังก์ชัน Helper สำหรับ format DATE เป็น YYYY-MM-DD
// ==============================
const formatDateToString = (date: any): string | null => {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// ==============================
// ตั้งค่า multer สำหรับอัปโหลดไฟล์
// ==============================
const uploadsDir = path.join(__dirname, "../../uploads");

// สร้างโฟลเดอร์ uploads ถ้าไม่มี
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `profile_${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// ตรวจสอบชนิดไฟล์ (รองรับ image และ octet-stream จาก Flutter)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;
  const isValid = allowedExtensions.test(file.originalname);
  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only image files (jpg, jpeg, png, gif, webp) are allowed."));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const getProfilePageData = async (req: Request, userId: number) => {
  const [users] = (await db.query(
    `SELECT
       account.user_id,
       account.user_name,
       account.first_name,
       account.last_name,
       CONCAT_WS(' ', account.first_name, account.last_name) AS full_name,
       account.email,
       account.user_pic,
       account.birthdate AS user_birthdate,
       account.gender AS user_gender,
       account.status AS account_status,
       DATE_FORMAT(account.created_at, '%Y-%m-%d %H:%i:%s') AS account_created_at,
       DATE_FORMAT(account.last_login, '%Y-%m-%d %H:%i:%s') AS last_login,
       department.department_id,
       department.department_code,
       department.department_name,
       faculty.faculty_id,
       faculty.faculty_name,
       student_term.student_term_id,
       student_term.year_level,
       academic_term.academic_year,
       academic_term.semester_no,
       student_term.status AS student_term_status
     FROM user account
     LEFT JOIN departments department
       ON department.department_id = account.department_id
     LEFT JOIN faculties faculty
       ON faculty.faculty_id = department.faculty_id
     LEFT JOIN student_terms student_term
       ON student_term.user_id = account.user_id
      AND student_term.status = 'active'
     LEFT JOIN academic_terms academic_term
       ON academic_term.academic_term_id = student_term.academic_term_id
     WHERE account.user_id = ?
     ORDER BY student_term.student_term_id DESC
     LIMIT 1`,
    [userId]
  )) as any;

  if (!users?.length) return null;
  const profile = users[0];
  profile.user_birthdate = formatDateToString(profile.user_birthdate);
  profile.user_pic_url = profile.user_pic
    ? `${req.protocol}://${req.get("host")}/uploads/${profile.user_pic}`
    : null;
  delete profile.user_pic;
  return profile;
};

// ==============================
// ดึงข้อมูลโปรไฟล์ผู้ใช้
// ==============================
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const [users] = (await db.query(
      `SELECT user_id, user_name, user_pic,
              birthdate AS user_birthdate, gender AS user_gender
       FROM user WHERE user_id = ?`,
      [userId]
    )) as any;

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];

    // Format DATE เป็น YYYY-MM-DD
    if (user.user_birthdate) {
      user.user_birthdate = formatDateToString(user.user_birthdate);
    }

    // สร้าง URL สำหรับรูปภาพถ้ามี
    if (user.user_pic) {
      user.user_pic_url = `${req.protocol}://${req.get("host")}/uploads/${user.user_pic}`;
    }

    res.json(user);
  } catch (error) {
    console.error("getUserProfile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// หน้าโปรไฟล์แบบเฉพาะ (สำหรับแสดงชื่อ เพศ วันเกิด ภาพ และปีการศึกษา)
// ==============================
export const getUserProfilePage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const profilePageData = await getProfilePageData(req, userId);
    if (!profilePageData) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(profilePageData);
  } catch (error) {
    console.error("getUserProfilePage error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// ฟังก์ชันลบไฟล์เก่า
// ==============================
const deleteOldImage = (imageName: string) => {
  const imagePath = path.join(uploadsDir, imageName);
  if (fs.existsSync(imagePath)) {
    try {
      fs.unlinkSync(imagePath);
    } catch (err) {
      console.error("Error deleting old image:", err);
    }
  }
};

// ==============================
// อัปเดทข้อมูลผู้ใช้ (ชื่อ, วันเกิด, เพศ)
// ==============================
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // ตรวจสอบว่าผู้ใช้มีอยู่หรือไม่
    const [users] = (await db.query("SELECT user_id FROM user WHERE user_id = ?", [userId])) as any;
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const { user_name, user_birthdate, user_gender } = req.body;

    // ตรวจสอบชื่อผู้ใช้ถ้ามีการอัปเดท
    if (user_name) {
      const usernameRegex = /^(?=.*[a-zA-Z])[a-zA-Z0-9]{3,}$/;
      if (!usernameRegex.test(user_name) || /^\d+$/.test(user_name)) {
        return res.status(400).json({
          message: "Username must contain at least one letter and only alphanumeric characters, min 3 chars",
        });
      }

      // ตรวจสอบว่าชื่อนี้มีผู้ใช้อื่นใช้อยู่หรือไม่
      const [existing] = (await db.query(
        "SELECT user_id FROM user WHERE user_name = ? AND user_id != ?",
        [user_name, userId]
      )) as any;
      if (existing && existing.length > 0) {
        return res.status(400).json({ message: "Username already taken" });
      }
    }

    // ตรวจสอบเพศถ้ามีการอัปเดท
    if (user_gender) {
      const validGenders = ["male", "female", "other"];
      if (!validGenders.includes(user_gender)) {
        return res.status(400).json({ message: "Invalid gender value" });
      }
    }

    // สร้าง query สำหรับอัปเดท
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (user_name) {
      updateFields.push("user_name = ?");
      updateValues.push(user_name);
    }
    if (user_birthdate) {
      updateFields.push("birthdate = ?");
      updateValues.push(user_birthdate);
    }
    if (user_gender) {
      updateFields.push("gender = ?");
      updateValues.push(user_gender);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    updateValues.push(userId);

    const query = `UPDATE user SET ${updateFields.join(", ")} WHERE user_id = ?`;
    await db.query(query, updateValues);

    const updatedUser = await getProfilePageData(req, userId);

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("updateUserProfile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// อัปเดทรูปโปรไฟล์
// ==============================
export const updateProfileImage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    // ตรวจสอบว่าผู้ใช้มีอยู่หรือไม่
    const [users] = (await db.query(
      "SELECT user_pic FROM user WHERE user_id = ?",
      [userId]
    )) as any;

    if (!users || users.length === 0) {
      deleteOldImage(req.file.filename);
      return res.status(404).json({ message: "User not found" });
    }

    const oldImage = users[0].user_pic;

    // ลบรูปเก่าถ้ามี
    if (oldImage) {
      deleteOldImage(oldImage);
    }

    // อัปเดทฐานข้อมูล
    const imageName = req.file.filename;
    await db.query("UPDATE user SET user_pic = ? WHERE user_id = ?", [imageName, userId]);

    res.json({
      message: "Profile image updated successfully",
      image_url: `${req.protocol}://${req.get("host")}/uploads/${imageName}`,
    });
  } catch (error) {
    console.error("updateProfileImage error:", error);
    // ลบไฟล์ที่อัปโหลดมาใหม่ถ้าเกิด error
    if (req.file) {
      deleteOldImage(req.file.filename);
    }
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// ดึงข้อมูล Constraints (จัดการเวลา)
// ==============================
export const getConstraints = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // ตรวจสอบว่าผู้ใช้มีอยู่หรือไม่
    const [users] = (await db.query("SELECT user_id FROM user WHERE user_id = ?", [userId])) as any;
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // ดึงข้อมูล constraints
    const [constraints] = (await db.query(
      `SELECT constraint_id, user_id, day_off,
              continuous_working_minutes AS continuous_working_duration,
              break_minutes AS \`break\`,
              TIME_FORMAT(available_start_time, '%H:%i:%s') AS start_time,
              TIME_FORMAT(available_end_time, '%H:%i:%s') AS end_time
       FROM user_constraints WHERE user_id = ?`,
      [userId]
    )) as any;

    if (!constraints || constraints.length === 0) {
      return res.status(404).json({ message: "No constraints found for this user" });
    }

    const constraintData = constraints[0];

    // Fetch multiple recurring busy times
    const [recurringBusyItems] = (await db.query(
      `SELECT day_of_week AS day,
              TIME_FORMAT(start_time, '%H:%i:%s') AS start,
              TIME_FORMAT(end_time, '%H:%i:%s') AS end
       FROM recurring_busy WHERE constraint_id = ?`,
      [constraintData.constraint_id]
    )) as any;

    constraintData.day_off = constraintDayToNumber(constraintData.day_off);
    constraintData.busy_days = (recurringBusyItems || []).map((item: any) => ({
      ...item,
      day: constraintDayToNumber(item.day),
    }));

    res.json(constraintData);
  } catch (error) {
    console.error("getConstraints error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// อัปเดท Constraints (จัดการเวลา)
// ==============================
export const updateConstraints = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // ตรวจสอบว่าผู้ใช้มีอยู่หรือไม่
    const [users] = (await db.query("SELECT user_id FROM user WHERE user_id = ?", [userId])) as any;
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const {
      day_off,
      continuous_working_duration,
      break: breakTime,
      start_time,
      end_time,
      busy_days,
    } = req.body;

    // ตรวจสอบรูปแบบเวลา (HH:mm:ss)
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
    const errors: string[] = [];

    const parseTimeToSeconds = (time: string) => {
      const parts = time.split(":").map(Number);
      return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
    };

    if (start_time && !timeRegex.test(start_time)) {
      errors.push("start_time must be in format HH:mm:ss");
    }
    if (end_time && !timeRegex.test(end_time)) {
      errors.push("end_time must be in format HH:mm:ss");
    }
    if (start_time && end_time && timeRegex.test(start_time) && timeRegex.test(end_time)) {
      if (parseTimeToSeconds(start_time) >= parseTimeToSeconds(end_time)) {
        errors.push("start_time must be before end_time");
      }
    }

    if (busy_days && Array.isArray(busy_days)) {
      for (let i = 0; i < busy_days.length; i++) {
        const bd = busy_days[i];
        if (bd.day < 1 || bd.day > 7) {
          errors.push(`busy_days[${i}].day must be between 1 and 7`);
        }
        if (!timeRegex.test(bd.start) || !timeRegex.test(bd.end)) {
          errors.push(`busy_days[${i}] start and end times must be in HH:mm or HH:mm:ss format`);
        } else if (parseTimeToSeconds(bd.start) >= parseTimeToSeconds(bd.end)) {
          errors.push(`busy_days[${i}] start time must be before end time`);
        }
      }
    }

    // ตรวจสอบค่าตัวเลข
    if (day_off !== undefined && day_off !== null && (isNaN(day_off) || day_off < 0 || day_off > 7)) {
      errors.push("day_off must be a number between 0-7");
    }
    if (continuous_working_duration !== undefined && continuous_working_duration !== null && isNaN(continuous_working_duration)) {
      errors.push("continuous_working_duration must be a number");
    }
    if (breakTime !== undefined && breakTime !== null && isNaN(breakTime)) {
      errors.push("break must be a number");
    }
    errors.push(
      ...validateConstraintForSave({
        dayOff: day_off == null ? null : Number(day_off),
        continuousWorkingDuration:
          continuous_working_duration == null
            ? null
            : Number(continuous_working_duration),
        breakDuration: breakTime == null ? null : Number(breakTime),
        startTime: start_time || null,
        endTime: end_time || null,
        busyDays: Array.isArray(busy_days) ? busy_days : [],
      }),
    );
    if (errors.length > 0) {
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    // ตรวจสอบว่า constraint มีอยู่หรือไม่
    const [existingConstraints] = (await db.query(
      "SELECT constraint_id FROM user_constraints WHERE user_id = ?",
      [userId]
    )) as any;

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (day_off !== undefined) {
      updateFields.push("day_off = ?");
      updateValues.push(constraintDayToDatabase(day_off == null ? null : Number(day_off)));
    }
    if (continuous_working_duration !== undefined) {
      updateFields.push("continuous_working_minutes = ?");
      updateValues.push(continuous_working_duration);
    }
    if (breakTime !== undefined) {
      updateFields.push("break_minutes = ?");
      updateValues.push(breakTime);
    }
    if (start_time !== undefined) {
      updateFields.push("available_start_time = ?");
      updateValues.push(start_time);
    }
    if (end_time !== undefined) {
      updateFields.push("available_end_time = ?");
      updateValues.push(end_time);
    }
    if (updateFields.length === 0 && (!busy_days || !Array.isArray(busy_days))) {
      return res.status(400).json({ message: "No fields to update" });
    }

    let constraintIdForItems = null;

    if (existingConstraints && existingConstraints.length > 0) {
      constraintIdForItems = existingConstraints[0].constraint_id;
      if (updateFields.length > 0) {
        updateValues.push(userId);
        const query = `UPDATE user_constraints SET ${updateFields.join(", ")} WHERE user_id = ?`;
        await db.query(query, updateValues);
      }
    } else {
      const insertFields = ["user_id"];
      const insertValues: unknown[] = [userId];

      if (day_off !== undefined) {
        insertFields.push("day_off");
        insertValues.push(
          constraintDayToDatabase(day_off == null ? null : Number(day_off)),
        );
      }
      if (continuous_working_duration !== undefined) {
        insertFields.push("continuous_working_minutes");
        insertValues.push(continuous_working_duration);
      }
      if (breakTime !== undefined) {
        insertFields.push("break_minutes");
        insertValues.push(breakTime);
      }
      if (start_time !== undefined) {
        insertFields.push("available_start_time");
        insertValues.push(start_time);
      }
      if (end_time !== undefined) {
        insertFields.push("available_end_time");
        insertValues.push(end_time);
      }

      if (insertFields.length > 1) { // More than just user_id
        const placeholders = insertFields.map(() => "?").join(", ");
        const query = `INSERT INTO user_constraints (${insertFields.join(", ")}) VALUES (${placeholders})`;
        const [insertResult]: any = await db.query(query, insertValues);
        constraintIdForItems = insertResult.insertId;
      }
    }

    if (constraintIdForItems !== null && busy_days && Array.isArray(busy_days)) {
      // Clear out existing recurring_busy objects and replace
      await db.query("DELETE FROM recurring_busy WHERE constraint_id = ?", [constraintIdForItems]);
      
      for (const bd of busy_days) {
        await db.query(
          `INSERT INTO recurring_busy
            (constraint_id, day_of_week, start_time, end_time)
           VALUES (?, ?, ?, ?)`,
          [constraintIdForItems, constraintDayToDatabase(Number(bd.day)), bd.start, bd.end]
        );
      }
    }

    // ดึงข้อมูล constraint ที่อัปเดทแล้ว
    const [updatedConstraints] = (await db.query(
      `SELECT constraint_id, user_id, day_off,
              continuous_working_minutes AS continuous_working_duration,
              break_minutes AS \`break\`,
              TIME_FORMAT(available_start_time, '%H:%i:%s') AS start_time,
              TIME_FORMAT(available_end_time, '%H:%i:%s') AS end_time
       FROM user_constraints WHERE user_id = ?`,
      [userId]
    )) as any;

    const constraintData = updatedConstraints[0];

    const [updatedRecurringBusyItems] = (await db.query(
      `SELECT day_of_week AS day,
              TIME_FORMAT(start_time, '%H:%i:%s') AS start,
              TIME_FORMAT(end_time, '%H:%i:%s') AS end
       FROM recurring_busy WHERE constraint_id = ?`,
      [constraintData.constraint_id]
    )) as any;

    constraintData.day_off = constraintDayToNumber(constraintData.day_off);
    constraintData.busy_days = (updatedRecurringBusyItems || []).map((item: any) => ({
      ...item,
      day: constraintDayToNumber(item.day),
    }));

    const recommendationResult = await safelyGenerateRecommendation({
      userId: Number(userId),
      triggerType: "constraint_changed",
    });

    res.json({
      message: "Constraints updated successfully",
      constraint: constraintData,
      schedule_recommendation: recommendationResult.recommendation,
      recommendation_warning: recommendationResult.warning,
    });
  } catch (error) {
    console.error("updateConstraints error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
