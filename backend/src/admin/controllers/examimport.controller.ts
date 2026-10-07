import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import db from "../../config/db";
import {
  ImageOutputDirs,
  parseDocxExamFile,
  parsePdfExamFile,
  ParsedQuestion,
} from "../../services/examParser.service";

interface QuestionBankImportRow extends RowDataPacket {
  question_bank_id: number;
  owner_instructor_id: number;
  bank_name: string;
  exam_period: "midterm" | "final";
  status: "draft" | "published" | "archived";
}

const hasExpectedFileSignature = (filePath: string, extension: string) => {
  const descriptor = fs.openSync(filePath, "r");
  try {
    const header = Buffer.alloc(8);
    const bytesRead = fs.readSync(descriptor, header, 0, header.length, 0);
    if (extension === ".pdf") {
      return header.subarray(0, Math.min(bytesRead, 5)).toString("ascii") === "%PDF-";
    }
    return (
      extension === ".docx" &&
      bytesRead >= 4 &&
      header[0] === 0x50 &&
      header[1] === 0x4b &&
      header[2] === 0x03 &&
      header[3] === 0x04
    );
  } finally {
    fs.closeSync(descriptor);
  }
};

const removeParsedImages = (questions: ParsedQuestion[], outputDirs: ImageOutputDirs) => {
  for (const question of questions) {
    if (question.question_image_path) {
      const filename = path.basename(question.question_image_path);
      fs.unlink(path.join(outputDirs.questionDir, filename), () => {});
    }
    for (const choice of question.choices) {
      if (choice.choice_image_path) {
        const filename = path.basename(choice.choice_image_path);
        fs.unlink(path.join(outputDirs.choiceDir, filename), () => {});
      }
    }
  }
};

// ==========================================================================
// ตรวจโครงสร้างโจทย์/ตัวเลือกก่อนบันทึก ถ้าข้อใดไม่ครบ จะไม่บันทึกทั้งไฟล์
// ==========================================================================
interface ValidationIssue {
  question_no: number;
  question_preview: string;
  problems: string[];
}

const MIN_CHOICES = 2;

const validateParsedQuestions = (questions: ParsedQuestion[]): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  questions.forEach((q, index) => {
    const problems: string[] = [];

    // โจทย์ต้องมีข้อความหรือรูป
    if (!q.question_text?.trim() && !q.question_image_path) {
      problems.push("โจทย์ไม่มีข้อความและไม่มีรูปภาพ");
    }

    // ตัวเลือกต้องมีอย่างน้อย MIN_CHOICES ข้อ
    if (!q.choices || q.choices.length === 0) {
      problems.push("ไม่พบตัวเลือก");
    } else if (q.choices.length < MIN_CHOICES) {
      problems.push(`มีตัวเลือกเพียง ${q.choices.length} ข้อ (ต้องมีอย่างน้อย ${MIN_CHOICES} ข้อ)`);
    }

    if (q.choices?.length) {
      // แต่ละตัวเลือกต้องมีข้อความหรือรูป
      q.choices.forEach((c, i) => {
        if (!c.choice_text?.trim() && !c.choice_image_path) {
          problems.push(`ตัวเลือกลำดับที่ ${i + 1} ว่างเปล่า`);
        }
      });

      // ต้องมีเฉลยพอดี 1 ข้อ
      const correctCount = q.choices.filter((c) => c.is_correct).length;
      if (correctCount === 0) {
        problems.push("ไม่มีเครื่องหมายเฉลย (*)");
      } else if (correctCount > 1) {
        problems.push(`มีเฉลยมากกว่า 1 ข้อ (${correctCount} ข้อ)`);
      }
    }

    if (problems.length > 0) {
      issues.push({
        question_no: index + 1,
        question_preview: (q.question_text || "").slice(0, 60),
        problems,
      });
    }
  });

  return issues;
};

export const importExamFile = async (req: Request, res: Response) => {
  try {
    // 1. ตรวจสอบสิทธิ์การใช้งาน
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }

    // ใช้ controller เดียวกันได้ทั้งเจ้าหน้าที่และอาจารย์ แต่ตรวจเจ้าของคลัง
    // เพิ่มเติมเมื่อเรียกจากเส้นทางของอาจารย์
    const allowedRoles = ["university_staff", "instructor"];
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
    const [bankRows] = await db.query<QuestionBankImportRow[]>(
      `SELECT question_bank_id, owner_instructor_id, bank_name, exam_period, status
       FROM question_banks WHERE question_bank_id = ?`,
      [question_bank_id]
    );

    if (bankRows.length === 0) {
      if (fs.existsSync(req.file.path)) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(404).json({ message: "question_bank_id not found in question_banks table" });
    }

    const currentBank = bankRows[0];

    if (currentBank.status === "archived") {
      if (fs.existsSync(req.file.path)) fs.unlink(req.file.path, () => {});
      return res.status(409).json({
        message: "พาร์ทนี้ถูกจัดเก็บแล้ว ไม่สามารถเพิ่มคำถามได้",
      });
    }

    if (
      req.user.role === "instructor" &&
      Number(currentBank.owner_instructor_id) !== req.user.id
    ) {
      if (fs.existsSync(req.file.path)) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(403).json({
        message: "Forbidden: This question bank belongs to another instructor",
      });
    }

    // 4. กำหนดโฟลเดอร์สำหรับเก็บรูปภาพและสร้างหากยังไม่มี
    const outputDirs: ImageOutputDirs = {
      questionDir: path.join(__dirname, "../../uploads/questions"),
      choiceDir: path.join(__dirname, "../../uploads/choices"),
    };
    if (!fs.existsSync(outputDirs.questionDir)) {
      fs.mkdirSync(outputDirs.questionDir, { recursive: true });
    }
    if (!fs.existsSync(outputDirs.choiceDir)) {
      fs.mkdirSync(outputDirs.choiceDir, { recursive: true });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();

    if (!hasExpectedFileSignature(req.file.path, ext)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        message: "เนื้อหาไฟล์ไม่ตรงกับชนิด PDF หรือ DOCX ที่เลือก",
      });
    }

    let parsedQuestions: ParsedQuestion[] = [];
    let warnings: unknown[] = [];

    // 5. แยกประมวลผลตามนามสกุลไฟล์
    if (ext === ".docx") {
      const parsed = await parseDocxExamFile(req.file.path, outputDirs);
      parsedQuestions = parsed.questions;
      warnings = parsed.warnings;
    } else if (ext === ".pdf") {
      const parsed = await parsePdfExamFile(req.file.path, outputDirs);
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
        warnings,
      });
    }

    // 5.1 ตรวจโครงสร้างโจทย์/ตัวเลือก ถ้าไม่ครบจะไม่บันทึกอะไรลง DB เลย
    const issues = validateParsedQuestions(parsedQuestions);
    if (issues.length > 0) {
      // ลบรูปที่ parser เขียนไว้แล้ว เพราะจะไม่บันทึก
      removeParsedImages(parsedQuestions, outputDirs);
      if (fs.existsSync(req.file.path)) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(422).json({
        message: `โครงสร้างข้อสอบไม่ครบถ้วน ${issues.length} ข้อ จึงไม่บันทึกข้อมูลใดๆ กรุณาแก้ไฟล์แล้วนำเข้าใหม่`,
        total_questions_parsed: parsedQuestions.length,
        invalid_questions: issues,
        warnings,
      });
    }

    // 6. บันทึกคำถามและตัวเลือกลงใน Database ด้วย Transaction
    const connection = await db.getConnection();
    const insertedQuestions = [];

    try {
      await connection.beginTransaction();

      const [lockedBankRows] = await connection.query<QuestionBankImportRow[]>(
        `SELECT question_bank_id, owner_instructor_id, bank_name, exam_period, status
         FROM question_banks
         WHERE question_bank_id = ?
         LIMIT 1 FOR UPDATE`,
        [question_bank_id],
      );
      const lockedBank = lockedBankRows[0];
      if (!lockedBank || lockedBank.status === "archived") {
        await connection.rollback();
        removeParsedImages(parsedQuestions, outputDirs);
        if (fs.existsSync(req.file.path)) fs.unlink(req.file.path, () => {});
        return res.status(409).json({
          message: "พาร์ทนี้ถูกจัดเก็บแล้ว ไม่สามารถเพิ่มคำถามได้",
        });
      }
      if (
        req.user.role === "instructor" &&
        Number(lockedBank.owner_instructor_id) !== req.user.id
      ) {
        await connection.rollback();
        removeParsedImages(parsedQuestions, outputDirs);
        if (fs.existsSync(req.file.path)) fs.unlink(req.file.path, () => {});
        return res.status(403).json({
          message: "Forbidden: This question bank belongs to another instructor",
        });
      }

      for (const q of parsedQuestions) {
        // บันทึกลงตาราง question (เชื่อมกับ question_bank_id)
        const [qResult] = await connection.query<ResultSetHeader>(
          `INSERT INTO question
            (question_bank_id, question_text, question_image_path, question_score, is_active)
           VALUES (?, ?, ?, ?, 1)`,
          [
            question_bank_id,
            q.question_text,
            q.question_image_path ?? null,
            q.score || 1, // บันทึกคะแนนดิบ ถ้าไม่มีให้ค่าเริ่มต้นเป็น 1
          ]
        );

        const questionId = qResult.insertId;

        // บันทึกลงตาราง choice
        for (let i = 0; i < q.choices.length; i++) {
          const choice = q.choices[i];
          await connection.query(
            `INSERT INTO choice
              (question_id, choice_order, choice_text, choice_image_path, is_correct, is_active)
             VALUES (?, ?, ?, ?, ?, 1)`,
            [
              questionId,
              i + 1,
              choice.choice_text,
              choice.choice_image_path ?? null,
              choice.is_correct ? 1 : 0,
            ]
          );
        }

        insertedQuestions.push({
          question_id: questionId,
          question_text: q.question_text,
          question_image_path: q.question_image_path,
          score: q.score || 1, // ส่งคะแนนดิบกลับไปใน Response ด้วย
          choice_count: q.choices.length,
        });
      }

      await connection.commit();
    } catch (dbErr) {
      await connection.rollback();
      removeParsedImages(parsedQuestions, outputDirs);
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