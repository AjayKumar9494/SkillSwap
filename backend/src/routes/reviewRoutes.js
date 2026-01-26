import { Router } from "express";
import { body, param } from "express-validator";
import { createReview, getAllReviews, getMyReviews, getReviewByBooking, listReviewsForSkill } from "../controllers/reviewController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/mine", requireAuth, getMyReviews);
router.get("/all", requireAuth, getAllReviews);
router.get("/skill/:skillId", [param("skillId").isMongoId().withMessage("Invalid skill id"), validate], listReviewsForSkill);
router.get("/booking/:bookingId", [requireAuth, param("bookingId").isMongoId().withMessage("Invalid booking id"), validate], getReviewByBooking);

router.post(
  "/",
  requireAuth,
  [
    body("bookingId").isMongoId().withMessage("bookingId is required"),
    body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be 1-5"),
    body("comment").optional().isString(),
    validate,
  ],
  createReview
);

export default router;

