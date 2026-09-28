import { Router } from "express";
import {
  deleteManagedInstructor,
  deleteManagedUser,
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
router.delete("/instructors/:instructorId", deleteManagedInstructor);
router.patch("/:userId/status", updateManagedUserStatus);
router.patch("/:userId", updateManagedUser);
router.delete("/:userId", deleteManagedUser);

export default router;
