import { Request, Response } from "express";
import db from "../../config/db";

// ==============================
// ADD NEW TERM
// (รับ user_id จาก URL param)
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

    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ message: "user_id is required in URL" });
    }

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

    const [result]: any = await db.query(
      `INSERT INTO terms (term, semester, academic_year, start_midterm, end_midterm, start_final, end_final, term_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [term, semester, academic_year, start_midterm || null, end_midterm || null, start_final || null, end_final || null]
    );

    res.status(201).json({
      message: "Term added successfully",
      term_id: result.insertId,
      user_id, // จาก URL param
    });
  } catch (err) {
    console.error("addTerm error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==============================
// GET CURRENT TERM (status = 1)
// (รับ user_id จาก URL param)
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

    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ message: "user_id is required in URL" });
    }

    const [rows]: any = await db.query(
      `SELECT * FROM terms WHERE term_status = 1 ORDER BY term_id DESC LIMIT 1`
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "No current term found" });
    }

    res.json({
      message: "Current term retrieved successfully",
      user_id, // จาก URL param
      data: rows[0],
    });
  } catch (err) {
    console.error("getCurrentTerm error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==============================
// GET ALL CURRENT TERMS (status = 1)
// ==============================
export const getAllCurrentTerms = async (req: Request, res: Response) => {
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
      `SELECT * FROM terms WHERE term_status = 1 ORDER BY term_id DESC`
    );

    res.json({
      message: "Current terms retrieved successfully",
      user_id: userId,
      data: rows,
    });
  } catch (err) {
    console.error("getAllCurrentTerms error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==============================
// GET ALL ENDED TERMS (status = 0)
// ==============================
export const getEndedTerms = async (req: Request, res: Response) => {
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
      `SELECT * FROM terms WHERE term_status = 0 ORDER BY term_id DESC`
    );

    res.json({
      message: "Ended terms retrieved successfully",
      user_id: userId,
      data: rows,
    });
  } catch (err) {
    console.error("getEndedTerms error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==============================
// END CURRENT TERM
// (รับ user_id จาก URL param, หาเทอมปัจจุบัน status = 1 เองแล้วจบให้)
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

    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ message: "user_id is required in URL" });
    }

    const [currentTermRows]: any = await db.query(
      `SELECT * FROM terms WHERE term_status = 1 ORDER BY term_id DESC LIMIT 1`
    );

    if (currentTermRows.length === 0) {
      return res.status(404).json({ message: "No current term to end" });
    }

    const currentTerm = currentTermRows[0];

    await db.query(
      `UPDATE terms SET term_status = 0 WHERE term_id = ?`,
      [currentTerm.term_id]
    );

    res.json({
      message: "Term ended successfully",
      user_id, // จาก URL param
      ended_term: currentTerm,
    });
  } catch (err) {
    console.error("endCurrentTerm error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==============================
// GET TERMS BY STATUS (0 or 1)
// ==============================
export const getTermsByStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }

    const { status } = req.params;

    if (status !== "0" && status !== "1") {
      return res.status(400).json({ message: "Status must be 0 or 1" });
    }

    const [rows]: any = await db.query(
      `SELECT * FROM terms WHERE term_status = ? ORDER BY term_id DESC`,
      [parseInt(status)]
    );

    res.json({
      message: `Terms with status ${status} retrieved successfully`,
      user_id: userId,
      data: rows,
    });
  } catch (err) {
    console.error("getTermsByStatus error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};