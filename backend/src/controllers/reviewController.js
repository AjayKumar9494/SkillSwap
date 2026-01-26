import { validationResult } from "express-validator";
import { Booking } from "../models/Booking.js";
import { Review } from "../models/Review.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { refreshSkillRating, refreshTeacherRating } from "../utils/ratings.js";
import { BOOKING_STATUS } from "../utils/constants.js";

const handleValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.array().map((e) => e.msg).join(", ");
    const err = new Error(msg);
    err.statusCode = 400;
    throw err;
  }
};

export const createReview = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { bookingId, rating, comment } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (booking.status !== BOOKING_STATUS.COMPLETED) {
    return res.status(400).json({ message: "Only completed bookings can be reviewed" });
  }
  if (String(booking.learner) !== String(req.user._id)) {
    return res.status(403).json({ message: "Only learner can review this booking" });
  }

  const existing = await Review.findOne({ booking: bookingId });
  if (existing) {
    return res.status(400).json({ message: "Review already submitted for this booking" });
  }

  const review = await Review.create({
    booking: booking._id,
    skill: booking.skill,
    teacher: booking.teacher,
    learner: booking.learner,
    rating,
    comment,
  });

  await refreshSkillRating(booking.skill);
  await refreshTeacherRating(booking.teacher);

  res.status(201).json(review);
});

export const listReviewsForSkill = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ skill: req.params.skillId })
    .sort({ createdAt: -1 })
    .populate("learner", "name");
  res.json(reviews);
});

export const getReviewByBooking = asyncHandler(async (req, res) => {
  const review = await Review.findOne({ booking: req.params.bookingId })
    .populate("learner", "name");
  if (!review) {
    return res.status(404).json({ message: "Review not found" });
  }
  res.json(review);
});

// GET /api/reviews/mine -> get all reviews submitted by current user
export const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ learner: req.user._id })
    .sort({ createdAt: -1 })
    .populate("skill", "title category")
    .populate("teacher", "name")
    .populate("booking", "sessionDate");
  res.json(reviews);
});

// GET /api/reviews/all -> get all reviews (for teachers to see reviews on their skills)
export const getAllReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({})
    .sort({ createdAt: -1 })
    .populate("skill", "title category")
    .populate("teacher", "name")
    .populate("learner", "name")
    .populate("booking", "sessionDate");
  res.json(reviews);
});
