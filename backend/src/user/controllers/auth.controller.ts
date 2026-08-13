import { Request, Response } from "express";
import db from "../../config/db";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import * as path from "path";
import * as fs from "fs";

// ==============================
// REGISTER USER
// ==============================
export const register = async (req: Request, res: Response) => {
  try {
    const {
      user_name,
      user_password,
      user_birthdate,
      user_gender,
    } = req.body;

    const usernameRegex = /^(?=.*[a-zA-Z])[a-zA-Z0-9]{3,}$/;
    if (!usernameRegex.test(user_name) || /^\d+$/.test(user_name)) {
      return res.status(400).json({
        message:
          "Username must contain at least one letter and only alphanumeric characters, min 3 chars",
      });
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(user_password)) {
      return res.status(400).json({
        message:
          "Password must be 8+ chars, include at least one letter & one special character",
      });
    }

    const validGenders = ["male", "female", "other"];
    if (user_gender && !validGenders.includes(user_gender)) {
      return res.status(400).json({ message: "Invalid gender value" });
    }

    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
    const {
      day_off,
      continuous_working_duration,
      break: breakTime,
      start_time,
      end_time,
      busy_days,
    } = req.body;

    const integerFields: Array<[string, any]> = [
      ["day_off", day_off],
      ["continuous_working_duration", continuous_working_duration],
      ["break", breakTime],
    ];

    for (const [field, value] of integerFields) {
      if (value !== undefined && value !== null && value !== "" && !Number.isInteger(Number(value))) {
        return res.status(400).json({ message: `${field} must be an integer` });
      }
    }

    const timeFields: Array<[string, any]> = [
      ["start_time", start_time],
      ["end_time", end_time],
    ];

    for (const [field, value] of timeFields) {
      if (value !== undefined && value !== null && value !== "" && !timeRegex.test(value)) {
        return res.status(400).json({
          message: `${field} must be in HH:mm or HH:mm:ss format`,
        });
      }
    }

    const parseTimeToSeconds = (time: string) => {
      const parts = time.split(":").map(Number);
      return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
    };

    if (start_time && end_time && timeRegex.test(start_time) && timeRegex.test(end_time)) {
      if (parseTimeToSeconds(start_time) >= parseTimeToSeconds(end_time)) {
        return res.status(400).json({
          message: "start_time must be before end_time",
        });
      }
    }

    if (busy_days && Array.isArray(busy_days)) {
      for (let i = 0; i < busy_days.length; i++) {
        const bd = busy_days[i];
        if (bd.day < 1 || bd.day > 7) {
          return res.status(400).json({ message: `busy_days[${i}].day must be between 1 and 7` });
        }
        if (!timeRegex.test(bd.start) || !timeRegex.test(bd.end)) {
          return res.status(400).json({ message: `busy_days[${i}] start and end times must be in HH:mm or HH:mm:ss format` });
        }
        if (parseTimeToSeconds(bd.start) >= parseTimeToSeconds(bd.end)) {
          return res.status(400).json({ message: `busy_days[${i}] start time must be before end time` });
        }
      }
    }

    const [existing]: any = await db.query(
      "SELECT user_id FROM user WHERE BINARY user_name = ?",
      [user_name]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(user_password, 10);

    const [userResult]: any = await db.query(
      `INSERT INTO user
        (user_name, user_password, user_birthdate, user_gender, last_login)
       VALUES (?, ?, ?, ?, ?)`,
      [
        user_name,
        hashedPassword,
        user_birthdate || null,
        user_gender || null,
        null,
      ]
    );

    const userId = userResult.insertId;

    const [constraintResult]: any = await db.query(
      `INSERT INTO \`constraint\`
        (user_id, day_off, continuous_working_duration, \`break\`, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        day_off ?? null,
        continuous_working_duration ?? null,
        breakTime ?? null,
        start_time || null,
        end_time || null,
      ]
    );

    const constraintId = constraintResult.insertId;

    if (busy_days && Array.isArray(busy_days) && busy_days.length > 0) {
      for (const bd of busy_days) {
        await db.query(
          `INSERT INTO recurring_busy
            (constraint_id, recurring_busy_day, recurring_busy_time_start, recurring_busy_time_end)
           VALUES (?, ?, ?, ?)`,
          [
            constraintId,
            bd.day,
            bd.start,
            bd.end
          ]
        );
      }
    }

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==============================
// LOGIN USER
// ==============================
export const login = async (req: Request, res: Response) => {
  try {
    const { user_name, user_password, platform } = req.body;

    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set");

    const [userRows]: any = await db.query(
      "SELECT * FROM user WHERE BINARY user_name = ?",
      [user_name]
    );
    if (userRows.length === 0) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const user = userRows[0];
    const isPasswordValid = await bcrypt.compare(user_password, user.user_password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const tokenExpiry = platform === "web" ? "24h" : "30m";
    const accessToken = jwt.sign(
      { id: user.user_id, role: "user" },
      process.env.JWT_SECRET!,
      { expiresIn: tokenExpiry }
    );

    const response: any = {
      message: "Login successful",
      role: "user",
      userId: user.user_id,
      accessToken,
      expiresIn: tokenExpiry,
    };

    if (platform === "mobile") {
      const refreshToken = jwt.sign(
        { id: user.user_id, role: "user" },
        process.env.JWT_SECRET!,
        { expiresIn: "30d" }
      );
      const refreshExpires = new Date();
      refreshExpires.setDate(refreshExpires.getDate() + 30);

      await db.query(
        "UPDATE user SET refresh_token = ?, refresh_token_expires_at = ?, last_login = NOW() WHERE user_id = ?",
        [refreshToken, refreshExpires, user.user_id]
      );

      response.refreshToken = refreshToken;
    } else {
      await db.query("UPDATE user SET last_login = NOW() WHERE user_id = ?", [user.user_id]);
    }

    res.json(response);
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==============================
// REFRESH TOKEN (User only)
// ==============================
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    const [rows]: any = await db.query(
      "SELECT * FROM user WHERE refresh_token = ? AND refresh_token_expires_at > NOW()",
      [refreshToken]
    );
    if (rows.length === 0) {
      return res.status(403).json({ message: "Invalid or expired refresh token" });
    }

    const user = rows[0];

    try {
      jwt.verify(refreshToken, process.env.JWT_SECRET!);
    } catch {
      await db.query(
        "UPDATE user SET refresh_token = NULL, refresh_token_expires_at = NULL WHERE user_id = ?",
        [user.user_id]
      );
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = jwt.sign(
      { id: user.user_id, role: "user" },
      process.env.JWT_SECRET!,
      { expiresIn: "30m" }
    );

    res.json({ accessToken: newAccessToken, expiresIn: "30m" });
  } catch (err) {
    console.error("refreshToken error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==============================
// LOGOUT USER (mobile only)
// ==============================
export const logout = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }

    await db.query(
      "UPDATE user SET refresh_token = NULL, refresh_token_expires_at = NULL WHERE user_id = ?",
      [userId]
    );

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("logout error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==============================
// HELPER: delete profile image
// ==============================
const deleteProfileImage = (imageName: string) => {
  const imagePath = path.join(__dirname, "../uploads", imageName);
  if (fs.existsSync(imagePath)) {
    try {
      fs.unlinkSync(imagePath);
    } catch (error) {
      console.error(`Error deleting profile image: ${imageName}`, error);
    }
  }
};

// ==============================
// DELETE OWN ACCOUNT
// ==============================
export const deleteOwnAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }

    const [user]: any = await db.query(
      "SELECT user_pic FROM user WHERE user_id = ?",
      [userId]
    );
    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const userPic = user[0].user_pic;
    if (userPic) deleteProfileImage(userPic);

    await db.query(
      "DELETE md FROM MealDetails md INNER JOIN Meals m ON md.meal_id = m.meal_id WHERE m.user_id = ?",
      [userId]
    );
    await db.query("DELETE FROM Meals WHERE user_id = ?", [userId]);
    await db.query(
      "DELETE ad FROM ActivityDetail ad INNER JOIN Activity a ON ad.activity_id = a.activity_id WHERE a.user_id = ?",
      [userId]
    );
    await db.query("DELETE FROM Activity WHERE user_id = ?", [userId]);
    await db.query("DELETE FROM DailyCalories WHERE user_id = ?", [userId]);
    await db.query("DELETE FROM AIAnalysis WHERE user_id = ?", [userId]);
    await db.query("DELETE FROM user WHERE user_id = ?", [userId]);

    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("deleteOwnAccount error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
