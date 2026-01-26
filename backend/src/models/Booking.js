import mongoose from "mongoose";
import { BOOKING_STATUS } from "../utils/constants.js";

const bookingSchema = new mongoose.Schema(
  {
    skill: { type: mongoose.Schema.Types.ObjectId, ref: "Skill", required: true, index: true },
    learner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
    },
    message: { type: String },
    creditCost: { type: Number, required: true },
    approvedAt: { type: Date },
    completedAt: { type: Date },
    sessionDate: { type: Date },
    sessionDuration: { type: Number, default: 60, min: 15, max: 480 }, // Duration in minutes (15 min to 8 hours)
    sessionStartTime: { type: Date },
    sessionEndTime: { type: Date },
    learnerJoined: { type: Boolean, default: false }, // Track if learner joined the session
    learnerJoinedAt: { type: Date }, // Timestamp when learner joined
  },
  { timestamps: true }
);

bookingSchema.index({ status: 1, teacher: 1 });

export const Booking = mongoose.model("Booking", bookingSchema);

