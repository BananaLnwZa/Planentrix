import { Router } from "express";
// ตรวจสอบชื่อไฟล์ controller ให้ตรงกับตัวพิมพ์เล็ก-ใหญ่ในเครื่อง
import { generatePracticeTest } from "../controllers/practicetest.controller"; 
import { verifyToken } from "../../middlewares/verifyToken";

const router = Router();

// POST /admin/practice-tests/generate
router.post("/generate", verifyToken, generatePracticeTest);

export default router;