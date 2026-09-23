import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import db from "../../config/db";
import {
  parseDocxExamFile,
  parsePdfExamFile,
  ParsedQuestion,
} from "../../services/examParser.service";

export const importExamFile = async (req: Request, res: Response) => {
  try {
    // 1. ตรวจสอบสิทธิ์การใช้งาน
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }

    // 2. ปรับให้รองรับ role ทั้ง university_staff และ admin ตามที่ตั้งไว้ใน Route
    const allowedRoles = ["admin", "university_staff"];
    if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }

    const question_bank_id = Number(req.body.question_bank_id);

    if (!Number.isInteger(question_bank_id) || question_bank_id <= 0) {
      return res.status(400).json({ message: "Valid question_bank_id is required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Exam file (.docx or .pdf) is required" });
    }

    // 3. ตรวจสอบและเชื่อมตาราง question_banks ว่ามี ID นี้อยู่จริงหรือไม่
    const [bankRows]: any = await db.query(
      `SELECT question_bank_id, bank_name, exam_period FROM question_banks WHERE question_bank_id = ?`,
      [question_bank_id]
    );

    if (bankRows.length === 0) {
      if (fs.existsSync(req.file.path)) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(404).json({ message: "question_bank_id not found in question_banks table" });
    }

    const currentBank = bankRows[0];

    // 4. กำหนดโฟลเดอร์สำหรับเก็บรูปภาพและสร้างหากยังไม่มี
    const outputImageDir = path.join(__dirname, "../../uploads/questions");
    if (!fs.existsSync(outputImageDir)) {
      fs.mkdirSync(outputImageDir, { recursive: true });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();

    let parsedQuestions: ParsedQuestion[] = [];
    let warnings: any[] = [];

    // 5. แยกประมวลผลตามนามสกุลไฟล์
    if (ext === ".docx") {
      const parsed = await parseDocxExamFile(req.file.path, outputImageDir);
      parsedQuestions = parsed.questions;
      warnings = parsed.warnings;
    } else if (ext === ".pdf") {
      const parsed = await parsePdfExamFile(req.file.path, outputImageDir);
      parsedQuestions = parsed.questions;
      warnings = parsed.warnings;
    } else {
      if (fs.existsSync(req.file.path)) {
        fs.unlink(req.file.path, () => {});
      }
      return res
        .status(400)
        .json({ message: "Unsupported file format. Only .docx and .pdf are allowed." });
    }

    if (parsedQuestions.length === 0) {
      if (fs.existsSync(req.file.path)) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(400).json({
        message: "No questions could be parsed from this file. Please check the document format.",
      });
    }

    // 6. บันทึกคำถามและตัวเลือกลงใน Database ด้วย Transaction
    const connection = await db.getConnection();
    const insertedQuestions = [];

    try {
      await connection.beginTransaction();

      for (const q of parsedQuestions) {
        // บันทึกลงตาราง question (เชื่อมกับ question_bank_id)
        const [qResult]: any = await connection.query(
          `INSERT INTO question (question_bank_id, question_text, question_image_path) VALUES (?, ?, ?)`,
          [question_bank_id, q.question_text, q.question_image_path ?? null]
        );

        const questionId = qResult.insertId;

        // บันทึกลงตาราง choice
        for (let i = 0; i < q.choices.length; i++) {
          const choice = q.choices[i];
          await connection.query(
            `INSERT INTO choice (question_id, choice_order, choice_text, choice_image, is_correct)
             VALUES (?, ?, ?, ?, ?)`,
            [
              questionId,
              i + 1,
              choice.choice_text,
              choice.choice_image ?? null,
              choice.is_correct ? 1 : 0,
            ]
          );
        }

        insertedQuestions.push({
          question_id: questionId,
          question_text: q.question_text,
          question_image_path: q.question_image_path,
          choice_count: q.choices.length,
        });
      }

      await connection.commit();
    } catch (dbErr) {
      await connection.rollback();
      throw dbErr;
    } finally {
      connection.release();
    }

    // ลบไฟล์ชั่วคราวที่อัปโหลดมา
    if (fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, () => {});
    }

    // ส่ง Response กลับ
    return res.status(201).json({
      message: "Exam file imported successfully",
      question_bank: {
        id: currentBank.question_bank_id,
        name: currentBank.bank_name,
        period: currentBank.exam_period,
      },
      total_questions_imported: insertedQuestions.length,
      questions: insertedQuestions,
      warnings,
    });
  } catch (err) {
    console.error("importExamFile error:", err);

    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, () => {});
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};