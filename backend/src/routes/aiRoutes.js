import { Router } from "express";
import { chat, analyzeComplaint } from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);

router.post("/chat", chat);
router.post("/analyze-complaint", analyzeComplaint);

export default router;
