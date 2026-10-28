import { Router } from "express";
import {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  assignComplaint,
} from "../controllers/complaintController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);

router.post("/", createComplaint);
router.get("/", getComplaints);
router.get("/:id", getComplaintById);
router.patch("/:id/status", authorize("admin"), updateComplaintStatus);
router.patch("/:id/assignment", authorize("admin"), assignComplaint);

export default router;