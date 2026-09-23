import { Router } from "express";
import multer from "multer";
import path from "path";
import { importExamFile } from "../controllers/examimport.controller";
import { verifyToken } from "../../middlewares/verifyToken";
import { requireRole } from "../../middlewares/requireRole";

const router = Router();

// ตั้งค่า Multer เก็บไฟล์ชั่วคราวลงโฟลเดอร์ uploads/temp/
const upload = multer({
  dest: "uploads/temp/",
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".docx" || ext === ".pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only .docx and .pdf files are allowed!"));
    }
  },
});

// POST /api/admin/exams/import
router.post(
  "/import",
  verifyToken,
  requireRole("university_staff"),
  upload.single("exam_file"),
  importExamFile
);

export default router;