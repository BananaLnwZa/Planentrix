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
router.get("/:id", verifyToken, getUserProfile);

// ดึงข้อมูลหน้าโปรไฟล์แบบตัวอย่าง (ต้องระบุ Token)
router.get("/:id/page", verifyToken, getUserProfilePage);

// ดึงข้อมูล constraints (ต้องระบุ Token)
router.get("/:id/constraints", verifyToken, getConstraints);

// อัปเดทข้อมูลผู้ใช้ (ต้องระบุ Token)
router.put("/:id", verifyToken, updateUserProfile);

// อัปเดท constraints (ต้องระบุ Token)
router.put("/:id/constraints", verifyToken, updateConstraints);

// อัปเดทรูปโปรไฟล์ (ต้องระบุ Token)
router.put("/:id/avatar", verifyToken, upload.single("avatar"), updateProfileImage);

export default router;
