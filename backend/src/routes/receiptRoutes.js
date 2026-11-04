import { Router } from "express";
import { listReceipts, getReceipt, downloadReceiptPdf } from "../controllers/receiptController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);

router.get("/", listReceipts);
router.get("/:id/pdf", downloadReceiptPdf);
router.get("/:id", getReceipt);

export default router;