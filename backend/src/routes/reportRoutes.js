import { Router } from "express";
import { getDashboardStats, getResidentReport } from "../controllers/reportController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect, authorize("admin"));

router.get("/dashboard", getDashboardStats);
router.get("/residents", getResidentReport);

export default router;
