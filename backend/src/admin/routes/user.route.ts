import { Router } from "express";
import {
  getManagedUsers,
  updateManagedInstructorStatus,
  updateManagedInstructor,
  updateManagedUserStatus,
  updateManagedUser,
} from "../controllers/user.controller";
import { verifyToken } from "../../middlewares/verifyToken";

const router = Router();

router.use(verifyToken);
router.get("/", getManagedUsers);
router.patch("/instructors/:instructorId/status", updateManagedInstructorStatus);
router.patch("/instructors/:instructorId", updateManagedInstructor);
router.patch("/:userId/status", updateManagedUserStatus);
router.patch("/:userId", updateManagedUser);

export default router;
