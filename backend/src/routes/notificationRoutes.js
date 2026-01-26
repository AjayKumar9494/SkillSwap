import { Router } from "express";
import { param } from "express-validator";
import {
  deleteNotification,
  getMyNotifications,
  markAllAsRead,
  markAsRead,
} from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(requireAuth);

router.get("/", getMyNotifications);
router.post("/:id/read", [param("id").isMongoId().withMessage("Invalid id"), validate], markAsRead);
router.post("/read-all", markAllAsRead);
router.delete("/:id", [param("id").isMongoId().withMessage("Invalid id"), validate], deleteNotification);

export default router;
