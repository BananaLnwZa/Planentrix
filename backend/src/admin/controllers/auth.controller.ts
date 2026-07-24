import { Request, Response } from "express";
import db from "../../config/db";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

// ==============================
// REGISTER ADMIN
// ==============================
export const registerAdmin = async (req: Request, res: Response) => {
  try {
    const {
      admin_name,
      admin_email,
      admin_password,
      first_name,
      last_name,
      phone_number,
      address,
    } = req.body;

    // Validate admin_name
    const usernameRegex = /^(?=.*[a-zA-Z])[a-zA-Z0-9]{3,}$/;
    if (!usernameRegex.test(admin_name) || /^\d+$/.test(admin_name)) {
      return res.status(400).json({
        message:
          "Username must contain at least one letter and only alphanumeric chars, min 3 chars",
      });
    }

    // Validate email
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(admin_email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    // Validate phone
    const phoneRegex = /^[0-9]{10}$/;
    if (phone_number && !phoneRegex.test(phone_number)) {
      return res.status(400).json({ message: "Phone number must be 10 digits" });
    }

    // Validate password
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(admin_password)) {
      return res.status(400).json({
        message:
          "Password must be 8+ chars, include at least one letter & one special character",
      });
    }

    // Check duplicate
    const [existing]: any = await db.query(
      "SELECT admin_id FROM admin WHERE BINARY admin_name = ? OR admin_email = ?",
      [admin_name, admin_email]
    );
    if (existing.length > 0) {
      return res
        .status(400)
        .json({ message: "Username or email already exists" });
    }

    const hashedPassword = await bcrypt.hash(admin_password, 10);

    await db.query(
      `INSERT INTO admin
        (admin_name, admin_email, admin_password, first_name, last_name, phone_number, address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        admin_name,
        admin_email,
        hashedPassword,
        first_name || null,
        last_name || null,
        phone_number || null,
        address || null,
      ]
    );

    res.status(201).json({ message: "Admin registered successfully" });
  } catch (err) {
    console.error("registerAdmin error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==============================
// LOGIN ADMIN
// ==============================
export const loginAdmin = async (req: Request, res: Response) => {
  try {
    const { admin_name, admin_password } = req.body;

    if (!admin_name || !admin_password) {
      return res.status(400).json({
        message: "admin_name and admin_password are required",
      });
    }

    console.log("loginAdmin body:", req.body);

    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set");

    const [adminRows]: any = await db.query(
      "SELECT * FROM admin WHERE BINARY admin_name = ?",
      [admin_name]
    );
    console.log("loginAdmin query rows:", adminRows.length, adminRows[0]);
    if (adminRows.length === 0) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const admin = adminRows[0];

    const isPasswordValid = await bcrypt.compare(
      admin_password,
      admin.admin_password
    );
    console.log("loginAdmin password valid:", isPasswordValid);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const accessToken = jwt.sign(
      { id: admin.admin_id, role: "admin" },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      role: "admin",
      adminId: admin.admin_id,
      accessToken,
      expiresIn: "24h",
    });
  } catch (err) {
    console.error("loginAdmin error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==============================
// LOGOUT ADMIN
// ==============================
export const logoutAdmin = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing admin ID" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }

    res.json({ message: "Admin logged out successfully" });
  } catch (err) {
    console.error("logoutAdmin error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
