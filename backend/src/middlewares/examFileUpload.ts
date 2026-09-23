import fs from "fs";
import path from "path";
import multer from "multer";

const tempDirectory = path.resolve(process.cwd(), "uploads", "temp");
fs.mkdirSync(tempDirectory, { recursive: true });

export const examFileUpload = multer({
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
