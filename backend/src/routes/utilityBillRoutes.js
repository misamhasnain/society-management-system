import { Router } from "express";
import {
  uploadUtilityBill,
  getUtilityBills,
  getVerificationStatus,
  reviewUtilityBill,
  getBillFile,
} from "../controllers/utilityBillController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { uploadBill } from "../middleware/uploadMiddleware.js";

const router = Router();

router.use(protect);

router.post("/upload", uploadBill.single("file"), uploadUtilityBill);
router.get("/", getUtilityBills);
router.get("/status", getVerificationStatus);
router.get("/:id/file", getBillFile);
router.patch("/:id/review", authorize("admin"), reviewUtilityBill);

export default router;
