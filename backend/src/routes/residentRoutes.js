import { Router } from "express";
import {
  getResidents,
  getResidentById,
  updateApproval,
  updateStatus,
} from "../controllers/residentController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect, authorize("admin"));

router.get("/", getResidents);
router.get("/:id", getResidentById);
router.patch("/:id/approval", updateApproval);
router.patch("/:id/status", updateStatus);

export default router;