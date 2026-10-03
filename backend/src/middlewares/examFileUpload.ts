import fs from "fs";
import path from "path";
import multer from "multer";
import type { NextFunction, Request, Response } from "express";

const tempDirectory = path.resolve(process.cwd(), "uploads", "temp");
fs.mkdirSync(tempDirectory, { recursive: true });

const examFileUpload = multer({
  dest: tempDirectory,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (extension === ".docx" || extension === ".pdf") {
      callback(null, true);
      return;
    }
    callback(new Error("รองรับเฉพาะไฟล์ .docx และ .pdf เท่านั้น"));
  },
});

export const uploadExamFile = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  examFileUpload.single("exam_file")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    const message =
      error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
        ? "ไฟล์ข้อสอบต้องมีขนาดไม่เกิน 20 MB"
        : error instanceof Error
          ? error.message
          : "ไม่สามารถอัปโหลดไฟล์ข้อสอบได้";
    res.status(400).json({ message });
  });
};
