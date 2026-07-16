import { Request, Response } from "express";
import db from "../../config/db";
import path from "path";
import multer from "multer";
import fs from "fs";

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

const getCurrentAcademicYear = async () => {
  const [terms] = (await db.query(
    "SELECT academic_year FROM terms WHERE term_status = 1 ORDER BY term_id DESC LIMIT 1"
  )) as any;
  return terms && terms.length > 0 ? terms[0].academic_year : null;
};

// ==============================
// ดึงข้อมูลโปรไฟล์ผู้ใช้
// ==============================
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const [users] = (await db.query(
      "SELECT user_id, user_name, user_pic, user_birthdate, user_gender FROM user WHERE user_id = ?",
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
    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const [users] = (await db.query(
      "SELECT user_id, user_name, user_pic, user_birthdate, user_gender FROM user WHERE user_id = ?",
      [userId]
    )) as any;

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];
    const academicYear = await getCurrentAcademicYear();

    if (user.user_birthdate) {
      user.user_birthdate = formatDateToString(user.user_birthdate);
    }

    const profilePageData = {
      user_id: user.user_id,
      user_name: user.user_name,
      user_gender: user.user_gender,
      user_birthdate: user.user_birthdate || null,
      user_pic_url: user.user_pic ? `${req.protocol}://${req.get("host")}/uploads/${user.user_pic}` : null,
      academic_year: academicYear,
    };

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
    const userId = Number(req.params.id);
    const authenticatedUserId = req.user?.id;

    if (!authenticatedUserId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (userId !== authenticatedUserId) {
      return res.status(403).json({ message: "Forbidden - Cannot update other user's profile" });
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
      updateFields.push("user_birthdate = ?");
      updateValues.push(user_birthdate);
    }
    if (user_gender) {
      updateFields.push("user_gender = ?");
      updateValues.push(user_gender);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    updateValues.push(userId);

    const query = `UPDATE user SET ${updateFields.join(", ")} WHERE user_id = ?`;
    await db.query(query, updateValues);

    // ดึงข้อมูลที่อัปเดทแล้ว
    const [updatedUsers] = (await db.query(
      "SELECT user_id, user_name, user_pic, user_birthdate, user_gender FROM user WHERE user_id = ?",
      [userId]
    )) as any;

    const updatedUser = updatedUsers[0];
    if (updatedUser.user_pic) {
      updatedUser.user_pic_url = `${req.protocol}://${req.get("host")}/uploads/${updatedUser.user_pic}`;
    }
    if (updatedUser.user_birthdate) {
      updatedUser.user_birthdate = formatDateToString(updatedUser.user_birthdate);
    }

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
    const userId = Number(req.params.id);
    const authenticatedUserId = req.user?.id;

    if (!authenticatedUserId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (userId !== authenticatedUserId) {
      return res.status(403).json({ message: "Forbidden - Cannot update other user's profile" });
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
    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    // ตรวจสอบว่าผู้ใช้มีอยู่หรือไม่
    const [users] = (await db.query("SELECT user_id FROM user WHERE user_id = ?", [userId])) as any;
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // ดึงข้อมูล constraints
    const [constraints] = (await db.query(
      `SELECT constraint_id, user_id, day_off, continuous_working_duration, \`break\`, 
              start_time, end_time, time_preference
       FROM \`constraint\` WHERE user_id = ?`,
      [userId]
    )) as any;

    if (!constraints || constraints.length === 0) {
      return res.status(404).json({ message: "No constraints found for this user" });
    }

    const constraintData = constraints[0];

    // Fetch multiple recurring busy times
    const [recurringBusyItems] = (await db.query(
      `SELECT recurring_busy_day as day, recurring_busy_time_start as start, recurring_busy_time_end as end
       FROM recurring_busy WHERE constraint_id = ?`,
      [constraintData.constraint_id]
    )) as any;

    constraintData.busy_days = recurringBusyItems || [];

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
    const userId = Number(req.params.id);
    const authenticatedUserId = req.user?.id;

    if (!authenticatedUserId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (userId !== authenticatedUserId) {
      return res.status(403).json({ message: "Forbidden - Cannot update other user's constraints" });
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
      time_preference,
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
    if (time_preference !== undefined && time_preference !== null && isNaN(time_preference)) {
      errors.push("time_preference must be a number");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    // ตรวจสอบว่า constraint มีอยู่หรือไม่
    const [existingConstraints] = (await db.query(
      "SELECT constraint_id FROM `constraint` WHERE user_id = ?",
      [userId]
    )) as any;

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (day_off !== undefined) {
      updateFields.push("day_off = ?");
      updateValues.push(day_off);
    }
    if (continuous_working_duration !== undefined) {
      updateFields.push("continuous_working_duration = ?");
      updateValues.push(continuous_working_duration);
    }
    if (breakTime !== undefined) {
      updateFields.push("`break` = ?");
      updateValues.push(breakTime);
    }
    if (start_time !== undefined) {
      updateFields.push("start_time = ?");
      updateValues.push(start_time);
    }
    if (end_time !== undefined) {
      updateFields.push("end_time = ?");
      updateValues.push(end_time);
    }
    if (time_preference !== undefined) {
      updateFields.push("time_preference = ?");
      updateValues.push(time_preference);
    }

    if (updateFields.length === 0 && (!busy_days || !Array.isArray(busy_days))) {
      return res.status(400).json({ message: "No fields to update" });
    }

    let constraintIdForItems = null;

    if (existingConstraints && existingConstraints.length > 0) {
      constraintIdForItems = existingConstraints[0].constraint_id;
      if (updateFields.length > 0) {
        updateValues.push(userId);
        const query = `UPDATE \`constraint\` SET ${updateFields.join(", ")} WHERE user_id = ?`;
        await db.query(query, updateValues);
      }
    } else {
      const insertFields = ["user_id"];
      const insertValues = [userId];

      day_off !== undefined && (insertFields.push("day_off"), insertValues.push(day_off));
      continuous_working_duration !== undefined && (insertFields.push("continuous_working_duration"), insertValues.push(continuous_working_duration));
      breakTime !== undefined && (insertFields.push("`break`"), insertValues.push(breakTime));
      start_time !== undefined && (insertFields.push("start_time"), insertValues.push(start_time));
      end_time !== undefined && (insertFields.push("end_time"), insertValues.push(end_time));
      time_preference !== undefined && (insertFields.push("time_preference"), insertValues.push(time_preference));

      if (insertFields.length > 1) { // More than just user_id
        const placeholders = insertFields.map(() => "?").join(", ");
        const query = `INSERT INTO \`constraint\` (${insertFields.join(", ")}) VALUES (${placeholders})`;
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
            (constraint_id, recurring_busy_day, recurring_busy_time_start, recurring_busy_time_end)
           VALUES (?, ?, ?, ?)`,
          [constraintIdForItems, bd.day, bd.start, bd.end]
        );
      }
    }

    // ดึงข้อมูล constraint ที่อัปเดทแล้ว
    const [updatedConstraints] = (await db.query(
      `SELECT constraint_id, user_id, day_off, continuous_working_duration, \`break\`, 
              start_time, end_time, time_preference
       FROM \`constraint\` WHERE user_id = ?`,
      [userId]
    )) as any;

    const constraintData = updatedConstraints[0];

    const [updatedRecurringBusyItems] = (await db.query(
      `SELECT recurring_busy_day as day, recurring_busy_time_start as start, recurring_busy_time_end as end
       FROM recurring_busy WHERE constraint_id = ?`,
      [constraintData.constraint_id]
    )) as any;

    constraintData.busy_days = updatedRecurringBusyItems || [];

    res.json({
      message: "Constraints updated successfully",
      constraint: constraintData,
    });
  } catch (error) {
    console.error("updateConstraints error:", error);
    res.status(500).json({ message: "Server error" });
  }
};