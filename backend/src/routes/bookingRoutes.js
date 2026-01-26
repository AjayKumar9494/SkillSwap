import { Router } from "express";
import { body, param } from "express-validator";
import {
  approveBooking,
  cancelBooking,
  cancelSessionByLearner,
  completeBooking,
  createBooking,
  deleteBooking,
  getBooking,
  listMyBookings,
  markLearnerJoined,
  rejectBooking,
} from "../controllers/bookingController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(requireAuth);

router.post(
  "/",
  [
    body("skillId").isMongoId().withMessage("skillId is required"),
    body("sessionDate").optional().isISO8601().withMessage("sessionDate must be a valid date"),
    body("sessionDuration").optional().isInt({ min: 15, max: 480 }).withMessage("sessionDuration must be between 15 and 480 minutes"),
    body("message").optional().isString(),
    validate,
  ],
  createBooking
);

router.get("/mine", listMyBookings);
router.get("/:id", [param("id").isMongoId().withMessage("Invalid id"), validate], getBooking);

router.post("/:id/approve", [param("id").isMongoId().withMessage("Invalid id"), validate], approveBooking);
router.post("/:id/reject", [param("id").isMongoId().withMessage("Invalid id"), validate], rejectBooking);
router.post("/:id/cancel", [param("id").isMongoId().withMessage("Invalid id"), validate], cancelBooking);
router.post("/:id/cancel-session", [param("id").isMongoId().withMessage("Invalid id"), validate], cancelSessionByLearner);
router.post("/:id/mark-learner-joined", [param("id").isMongoId().withMessage("Invalid id"), validate], markLearnerJoined);
router.post("/:id/complete", [param("id").isMongoId().withMessage("Invalid id"), validate], completeBooking);
router.delete("/:id", [param("id").isMongoId().withMessage("Invalid id"), validate], deleteBooking);

export default router;

