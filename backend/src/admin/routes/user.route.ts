import { Router } from "express";
import {
  deleteManagedUser,
  getManagedUsers,
  updateManagedUser,
} from "../controllers/user.controller";
import { verifyToken } from "../../middlewares/verifyToken";

const router = Router();

router.use(verifyToken);
router.get("/", getManagedUsers);
router.patch("/:userId", updateManagedUser);
router.delete("/:userId", deleteManagedUser);

export default router;
