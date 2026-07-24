import { Request, Response } from "express";
import db from "../../config/db";

const isValidDateString = (value: any) => {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

// ==============================
// ADD NEW TERM
// ==============================
export const addTerm = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const {
      term,
      semester,
      academic_year,
      start_midterm,
      end_midterm,
      start_final,
      end_final,
    } = req.body;

    if (!term || !semester || !academic_year) {
      return res.status(400).json({
        message: "term, semester, and academic_year are required",
      });
    }

    const dateFields = { start_midterm, end_midterm, start_final, end_final };
    for (const [key, value] of Object.entries(dateFields)) {
      if (value !== undefined && value !== null && !isValidDateString(value)) {
        return res.status(400).json({
          message: `${key} must be a valid date in YYYY-MM-DD format`,
        });
      }
    }

    const [result]: any = await db.query(
      `INSERT INTO terms (user_id, term, semester, academic_year, start_midterm, end_midterm, start_final, end_final, term_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [userId, term, semester, academic_year, start_midterm || null, end_midterm || null, start_final || null, end_final || null]
    );

    res.status(201).json({
      message: "Term added successfully",
      term_id: result.insertId,
    });
  } catch (err) {
    console.error("addTerm error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==============================
// GET CURRENT TERM (status = 1)
// ==============================
export const getCurrentTerm = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const [rows]: any = await db.query(
      `SELECT * FROM terms
       WHERE user_id = ? AND term_status = 1
       ORDER BY term_id DESC LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "No current term found" });
    }

    res.json({
      message: "Current term retrieved successfully",
      data: rows[0],
    });
  } catch (err) {
    console.error("getCurrentTerm error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==============================
// END CURRENT TERM
// (หาเทอมปัจจุบัน status = 1 เองแล้วจบให้)
// ==============================
export const endCurrentTerm = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }
    if (authUser.role && authUser.role !== "user") {
      return res.status(403).json({ message: "Forbidden: user role required" });
    }
    const userId = authUser.id;

    const [currentTermRows]: any = await db.query(
      `SELECT * FROM terms
       WHERE user_id = ? AND term_status = 1
       ORDER BY term_id DESC LIMIT 1`,
      [userId]
    );

    if (currentTermRows.length === 0) {
      return res.status(404).json({ message: "No current term to end" });
    }

    const currentTerm = currentTermRows[0];

    await db.query(
      `UPDATE terms SET term_status = 0 WHERE term_id = ? AND user_id = ?`,
      [currentTerm.term_id, userId]
    );

    res.json({
      message: "Term ended successfully",
      ended_term: currentTerm,
    });
  } catch (err) {
    console.error("endCurrentTerm error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
