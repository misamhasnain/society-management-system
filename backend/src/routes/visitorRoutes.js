import { Router } from "express";
import {
  createVisitor,
  preRegisterVisitor,
  checkInVisitor,
  getVisitors,
  markExit,
} from "../controllers/visitorController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);

router.post("/", authorize("admin"), createVisitor);
router.post("/pre-register", preRegisterVisitor);
router.get("/", getVisitors);
router.patch("/:id/check-in", authorize("admin"), checkInVisitor);
router.patch("/:id/exit", authorize("admin"), markExit);

export default router;
