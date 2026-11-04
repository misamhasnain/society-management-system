import { Router } from "express";
import {
  submitPaymentProof,
  getPaymentProofs,
  reviewPaymentProof,
  getProofFile,
} from "../controllers/paymentProofController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { uploadProofFile } from "../middleware/uploadMiddleware.js";

const router = Router();

router.use(protect);

router.post("/", uploadProofFile, submitPaymentProof);
router.get("/", getPaymentProofs);
router.get("/:id/file", getProofFile);
router.patch("/:id/review", authorize("admin"), reviewPaymentProof);

export default router;