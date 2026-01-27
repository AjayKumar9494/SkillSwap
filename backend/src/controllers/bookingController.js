import { validationResult } from "express-validator";
import { Booking } from "../models/Booking.js";
import { Skill } from "../models/Skill.js";
import { User } from "../models/User.js";
import { BOOKING_STATUS } from "../utils/constants.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { logTransaction } from "../utils/transactions.js";
import { createNotification } from "../utils/notifications.js";

const handleValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.array().map((e) => e.msg).join(", ");
    const err = new Error(msg);
    err.statusCode = 400;
    throw err;
  }
};

export const createBooking = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { skillId, message, sessionDate, sessionDuration } = req.body;
  const skill = await Skill.findById(skillId);
  if (!skill) return res.status(404).json({ message: "Skill not found" });
  if (skill.mode === "offline") {
    return res.status(400).json({ message: "Offline skills are video-based. Unlock the video instead of booking." });
  }
  if (String(skill.owner) === String(req.user._id)) {
    return res.status(400).json({ message: "You cannot book your own skill" });
  }
  if (req.user.credits < skill.creditCost) {
    return res.status(400).json({ message: "Insufficient credits" });
  }

  // Validate session duration (15 minutes to 8 hours)
  const duration = sessionDuration ? Number(sessionDuration) : 60;
  if (duration < 15 || duration > 480) {
    return res.status(400).json({ message: "Session duration must be between 15 minutes and 8 hours" });
  }

  // Calculate session end time if session date is provided
  // Preserve the exact time as provided (treat as local time, not UTC)
  let sessionEndTime = null;
  if (sessionDate) {
    const startTimeObj = new Date(sessionDate);
    // Create a new date using local time components to avoid UTC conversion
    const localStartTime = new Date(
      startTimeObj.getFullYear(),
      startTimeObj.getMonth(),
      startTimeObj.getDate(),
      startTimeObj.getHours(),
      startTimeObj.getMinutes(),
      startTimeObj.getSeconds()
    );
    sessionEndTime = new Date(localStartTime.getTime() + duration * 60 * 1000);
  }

  // Store sessionDate preserving local time
  let storedSessionDate = null;
  if (sessionDate) {
    const dateObj = new Date(sessionDate);
    // Create date using local time components to preserve the exact time
    storedSessionDate = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate(),
      dateObj.getHours(),
      dateObj.getMinutes(),
      dateObj.getSeconds()
    );
  }

  const booking = await Booking.create({
    skill: skill._id,
    learner: req.user._id,
    teacher: skill.owner,
    creditCost: skill.creditCost,
    message,
    sessionDate: storedSessionDate || sessionDate,
    sessionDuration: duration,
    sessionEndTime,
  });

  req.user.credits -= skill.creditCost;
  await req.user.save();
  await logTransaction({
    userId: req.user._id,
    type: "spend",
    amount: skill.creditCost,
    description: `Booked ${skill.title}`,
    balanceAfter: req.user.credits,
    meta: { booking: booking._id },
  });

  // Notify teacher about new booking request
  await createNotification({
    userId: skill.owner,
    type: "booking_created",
    title: "New Session Booking",
    message: `${req.user.name} has booked a session for "${skill.title}". ${sessionDate ? `Session scheduled for ${new Date(sessionDate).toLocaleString()}.` : ""}`,
    bookingId: booking._id,
  });

  res.status(201).json(booking);
});

export const listMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({
    $or: [{ learner: req.user._id }, { teacher: req.user._id }],
  })
    .sort({ createdAt: -1 })
    .populate("skill", "title creditCost mode")
    .populate("learner", "name")
    .populate("teacher", "name");
  res.json(bookings);
});

export const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("skill", "title creditCost mode")
    .populate("learner", "name email")
    .populate("teacher", "name email");
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  // Only allow teacher or learner to access
  if (String(booking.learner._id) !== String(req.user._id) && String(booking.teacher._id) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not authorized" });
  }
  res.json(booking);
});

export const approveBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("skill", "title")
    .populate("learner", "name email");
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (String(booking.teacher) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not authorized" });
  }
  if (booking.status !== BOOKING_STATUS.PENDING) {
    return res.status(400).json({ message: "Only pending bookings can be approved" });
  }
  
  booking.status = BOOKING_STATUS.APPROVED;
  booking.approvedAt = new Date();
  
  // Set session start and end times if sessionDate is set
  // Preserve the exact time as provided (treat as local time, not UTC)
  if (booking.sessionDate) {
    const sessionDateObj = new Date(booking.sessionDate);
    // If the date string doesn't have timezone info, treat it as local time
    // Create a new date using local time components to avoid UTC conversion
    const localDate = new Date(
      sessionDateObj.getFullYear(),
      sessionDateObj.getMonth(),
      sessionDateObj.getDate(),
      sessionDateObj.getHours(),
      sessionDateObj.getMinutes(),
      sessionDateObj.getSeconds()
    );
    booking.sessionStartTime = localDate;
    if (booking.sessionDuration) {
      booking.sessionEndTime = new Date(localDate.getTime() + booking.sessionDuration * 60 * 1000);
    }
  }
  
  await booking.save();

  // Notify learner that booking is approved
  await createNotification({
    userId: booking.learner._id,
    type: "booking_approved",
    title: "Session Approved",
    message: `Your booking request for "${booking.skill?.title}" has been approved by ${req.user.name}. ${booking.sessionDate ? `Session scheduled for ${new Date(booking.sessionDate).toLocaleString()}.` : ""}`,
    bookingId: booking._id,
  });

  res.json(booking);
});

export const rejectBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("skill", "title")
    .populate("learner", "name email");
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (String(booking.teacher) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not authorized" });
  }
  if (booking.status !== BOOKING_STATUS.PENDING) {
    return res.status(400).json({ message: "Only pending bookings can be rejected" });
  }
  booking.status = BOOKING_STATUS.REJECTED;
  await booking.save();

  // Refund learner
  const learner = await User.findById(booking.learner._id);
  if (learner) {
    learner.credits += booking.creditCost;
    await learner.save();
    await logTransaction({
      userId: learner._id,
      type: "earn",
      amount: booking.creditCost,
      description: "Booking rejected - refund",
      balanceAfter: learner.credits,
      meta: { booking: booking._id },
    });

    // Notify learner that booking is rejected
    await createNotification({
      userId: learner._id,
      type: "booking_rejected",
      title: "Session Request Rejected",
      message: `Your booking request for "${booking.skill?.title}" has been rejected by ${req.user.name}. Your credits have been refunded.`,
      bookingId: booking._id,
    });
  }

  res.json(booking);
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("skill", "title")
    .populate("learner", "name email credits")
    .populate("teacher", "name email");
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  
  // Only learner can cancel their own pending bookings
  if (String(booking.learner._id || booking.learner) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not authorized. Only the learner can cancel their booking." });
  }
  
  if (booking.status !== BOOKING_STATUS.PENDING) {
    return res.status(400).json({ message: "Only pending bookings can be cancelled by the learner" });
  }

  // Store booking info before deletion
  const skillTitle = booking.skill?.title || "Skill";
  const teacherId = booking.teacher._id || booking.teacher;
  const bookingId = booking._id;
  const creditCost = booking.creditCost;

  // Refund credits to learner
  const learner = await User.findById(booking.learner._id || booking.learner);
  if (learner) {
    learner.credits += creditCost;
    await learner.save();
    await logTransaction({
      userId: learner._id,
      type: "earn",
      amount: creditCost,
      description: `Booking cancelled - refund for ${skillTitle}`,
      balanceAfter: learner.credits,
      meta: { booking: bookingId },
    });
  }

  // Notify teacher about cancellation before deleting
  await createNotification({
    userId: teacherId,
    type: "booking_cancelled",
    title: "Booking Cancelled",
    message: `The booking request for "${skillTitle}" has been cancelled by ${learner?.name || "the learner"}.`,
    bookingId: bookingId,
  });

  // Delete the booking
  await booking.deleteOne();

  res.json({ message: "Booking cancelled and credits refunded" });
});

export const completeBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("skill", "title")
    .populate("learner", "name email")
    .populate("teacher", "name email");
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (![BOOKING_STATUS.APPROVED].includes(booking.status)) {
    return res.status(400).json({ message: "Only approved bookings can be completed" });
  }
  if (![String(booking.teacher._id), String(booking.learner._id)].includes(String(req.user._id))) {
    return res.status(403).json({ message: "Not authorized" });
  }

  // Check session time limits
  const now = new Date();
  
  // If sessionStartTime is set, check if session has started
  if (booking.sessionStartTime && now < booking.sessionStartTime) {
    return res.status(400).json({ 
      message: `Session cannot be completed yet. Session starts at ${new Date(booking.sessionStartTime).toLocaleString()}` 
    });
  }

  // If sessionEndTime is set, check if session time limit has been reached
  // Allow completion if current time is past session end time (automatic completion)
  if (booking.sessionEndTime && now < booking.sessionEndTime) {
    const remainingMinutes = Math.ceil((booking.sessionEndTime - now) / (1000 * 60));
    return res.status(400).json({ 
      message: `Session cannot be completed yet. ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""} remaining. Session ends at ${new Date(booking.sessionEndTime).toLocaleString()}` 
    });
  }

  // Session has ended - proceed with automatic completion
  booking.status = BOOKING_STATUS.COMPLETED;
  booking.completedAt = new Date();
  await booking.save();

  // Credit teacher ONLY if learner joined the session
  if (booking.learnerJoined) {
    const teacherUser = await User.findById(booking.teacher._id);
    if (!teacherUser) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    teacherUser.credits += booking.creditCost;
    await teacherUser.save();
    await logTransaction({
      userId: teacherUser._id,
      type: "earn",
      amount: booking.creditCost,
      description: `Completed session: ${booking.skill?.title || "Skill"}`,
      balanceAfter: teacherUser.credits,
      meta: { booking: booking._id },
    });
  } else {
    // Refund learner if they didn't join
    const learnerUser = await User.findById(booking.learner._id);
    if (learnerUser) {
      learnerUser.credits += booking.creditCost;
      await learnerUser.save();
      await logTransaction({
        userId: learnerUser._id,
        type: "earn",
        amount: booking.creditCost,
        description: `Session not attended - refund for ${booking.skill?.title || "Skill"}`,
        balanceAfter: learnerUser.credits,
        meta: { booking: booking._id },
      });
    }
  }

  // Notify both teacher and learner about completion
  if (booking.learnerJoined) {
    await createNotification({
      userId: booking.teacher._id,
      type: "booking_completed",
      title: "Session Completed",
      message: `Session for "${booking.skill?.title}" has been completed automatically. You earned ${booking.creditCost} credits.`,
      bookingId: booking._id,
    });

    await createNotification({
      userId: booking.learner._id,
      type: "booking_completed",
      title: "Session Completed",
      message: `Your session for "${booking.skill?.title}" has been completed automatically. Don't forget to leave a review!`,
      bookingId: booking._id,
    });
  } else {
    await createNotification({
      userId: booking.teacher._id,
      type: "booking_completed",
      title: "Session Ended",
      message: `Session for "${booking.skill?.title}" has ended. Learner did not join, so no credits were transferred.`,
      bookingId: booking._id,
    });

    await createNotification({
      userId: booking.learner._id,
      type: "booking_completed",
      title: "Session Ended",
      message: `Your session for "${booking.skill?.title}" has ended. Since you didn't join, your credits have been refunded.`,
      bookingId: booking._id,
    });
  }

  res.json(booking);
});

// DELETE /api/bookings/:id - Delete a booking (only for teachers, only for completed/approved/rejected)
export const deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("skill", "title")
    .populate("learner", "name")
    .populate("teacher", "name");
  
  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  // Only teachers can delete bookings
  if (String(booking.teacher?._id || booking.teacher) !== String(req.user._id)) {
    return res.status(403).json({ message: "Only the teacher can delete this booking" });
  }

  // Only allow deletion of completed, approved, or rejected bookings
  if (!["completed", "approved", "rejected"].includes(booking.status)) {
    return res.status(400).json({ 
      message: "Only completed, approved, or rejected bookings can be deleted" 
    });
  }

  const skillTitle = booking.skill?.title || "Skill";
  const learnerId = booking.learner?._id || booking.learner;
  const creditCost = booking.creditCost;
  const bookingStatus = booking.status; // Store status before deletion
  const bookingId = booking._id; // Store ID before deletion

  // Refund credits to learner if booking was approved or completed
  if (["approved", "completed"].includes(bookingStatus) && learnerId) {
    const learner = await User.findById(learnerId);
    if (learner) {
      learner.credits += creditCost;
      await learner.save();
      await logTransaction({
        userId: learner._id,
        type: "earn",
        amount: creditCost,
        description: `Teacher cancelled session - refund for ${skillTitle}`,
        balanceAfter: learner.credits,
        meta: { booking: bookingId },
      });
    }
  }

  // Delete associated review if exists
  const { Review } = await import("../models/Review.js");
  await Review.deleteMany({ booking: bookingId });

  // Delete the booking
  await booking.deleteOne();

  // Notify learner about deletion if learner exists
  if (learnerId) {
    await createNotification({
      userId: learnerId,
      type: "booking_deleted",
      title: "Session Cancelled by Teacher",
      message: `Teacher cancelled the session for "${skillTitle}". ${["approved", "completed"].includes(bookingStatus) ? "Your credits have been refunded." : ""}`,
      bookingId: bookingId,
    });
  }

  res.json({ message: "Booking deleted successfully" });
});

// POST /api/bookings/:id/mark-learner-joined - Mark learner as joined (called when learner starts call)
export const markLearnerJoined = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("learner", "_id");
  
  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  // Only learner can mark themselves as joined
  if (String(booking.learner?._id || booking.learner) !== String(req.user._id)) {
    return res.status(403).json({ message: "Only the learner can mark themselves as joined" });
  }

  if (!booking.learnerJoined) {
    booking.learnerJoined = true;
    booking.learnerJoinedAt = new Date();
    await booking.save();
  }

  res.json({ message: "Learner marked as joined", booking });
});

// POST /api/bookings/:id/cancel-by-learner - Cancel session by learner (only for pending sessions)
export const cancelSessionByLearner = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("skill", "title")
    .populate("learner", "name email credits")
    .populate("teacher", "name email");
  
  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  // Only learner can cancel
  if (String(booking.learner?._id || booking.learner) !== String(req.user._id)) {
    return res.status(403).json({ message: "Only the learner can cancel this session" });
  }

  // Only allow cancellation of pending sessions (before approval)
  if (booking.status !== BOOKING_STATUS.PENDING) {
    return res.status(400).json({ message: "Only pending sessions can be cancelled. Once approved, cancellation is not allowed." });
  }

  const skillTitle = booking.skill?.title || "Skill";
  const teacherId = booking.teacher?._id || booking.teacher;
  const creditCost = booking.creditCost;

  // Refund credits to learner
  const learner = await User.findById(booking.learner._id || booking.learner);
  if (learner) {
    learner.credits += creditCost;
    await learner.save();
    await logTransaction({
      userId: learner._id,
      type: "earn",
      amount: creditCost,
      description: `Session cancelled - refund for ${skillTitle}`,
      balanceAfter: learner.credits,
      meta: { booking: booking._id },
    });
  }

  // Notify teacher
  await createNotification({
    userId: teacherId,
    type: "booking_cancelled",
    title: "Session Cancelled",
    message: `The session for "${skillTitle}" has been cancelled by ${learner?.name || "the learner"}.`,
    bookingId: booking._id,
  });

  // Delete the booking
  await booking.deleteOne();

  res.json({ message: "Session cancelled and credits refunded" });
});
