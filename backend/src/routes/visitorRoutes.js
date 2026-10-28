import { Router } from "express";
import { createVisitor, getVisitors, markExit } from "../controllers/visitorController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);

router.post("/", authorize("admin"), createVisitor);
router.get("/", getVisitors);
router.patch("/:id/exit", authorize("admin"), markExit);

export default router;
