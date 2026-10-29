import { Router } from "express";
import {
  getNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  archiveNotice,
  acknowledgeNotice,
} from "../controllers/noticeController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);

router.get("/", getNotices);
router.post("/", authorize("admin"), createNotice);
router.get("/:id", getNoticeById);
router.patch("/:id/acknowledge", acknowledgeNotice);
router.patch("/:id", authorize("admin"), updateNotice);
router.patch("/:id/archive", authorize("admin"), archiveNotice);

export default router;
