import { Router } from "express";
import {
  getUserProfile,
  getUserProfilePage,
  updateUserProfile,
  updateProfileImage,
  upload,
  getConstraints,
  updateConstraints,
} from "../controllers/profile.controller";
import { verifyToken } from "../../middlewares/verifyToken";

const router = Router();

// ดึงข้อมูลโปรไฟล์ผู้ใช้ (ต้องระบุ Token)
router.get("/", verifyToken, getUserProfile);

// ดึงข้อมูลหน้าโปรไฟล์แบบตัวอย่าง (ต้องระบุ Token)
router.get("/page", verifyToken, getUserProfilePage);

// ดึงข้อมูล constraints (ต้องระบุ Token)
router.get("/constraints", verifyToken, getConstraints);

// อัปเดทข้อมูลผู้ใช้ (ต้องระบุ Token)
router.put("/", verifyToken, updateUserProfile);

// อัปเดท constraints (ต้องระบุ Token)
router.put("/constraints", verifyToken, updateConstraints);

// อัปเดทรูปโปรไฟล์ (ต้องระบุ Token)
router.put("/avatar", verifyToken, upload.single("avatar"), updateProfileImage);

export default router;
