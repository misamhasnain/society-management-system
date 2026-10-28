import { Router } from "express";
import {
  getAvailableHouses,
  getHouses,
  getHouseById,
  createHouse,
  updateHouse,
} from "../controllers/houseController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = Router();

// Public (registration page)
router.get("/available", getAvailableHouses);

// Admin only
router.use(protect, authorize("admin"));
router.get("/", getHouses);
router.post("/", createHouse);
router.get("/:id", getHouseById);
router.patch("/:id", updateHouse);

export default router;