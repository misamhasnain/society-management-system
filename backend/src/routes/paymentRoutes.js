import { Router } from "express";
import {
  getPayments,
  getPaymentById,
  createPayment,
  createBulkPayments,
  submitPaymentRequest,
  updatePaymentStatus,
  sendDueReminder,
} from "../controllers/paymentController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);

router.get("/", getPayments);
router.post("/", authorize("admin"), createPayment);
router.post("/bulk", authorize("admin"), createBulkPayments);
router.get("/:id", getPaymentById);
router.patch("/:id/request-pay", submitPaymentRequest);
router.patch("/:id/status", authorize("admin"), updatePaymentStatus);
router.post("/:id/remind", authorize("admin"), sendDueReminder);

export default router;
