import { Booking } from "../models/Booking.js";
import { Skill } from "../models/Skill.js";
import { BOOKING_STATUS } from "../utils/constants.js";

export const getPublicStats = async (req, res) => {
  const [skillsListed, bookingsCompleted] = await Promise.all([
    Skill.countDocuments({}),
    Booking.countDocuments({ status: BOOKING_STATUS.COMPLETED }),
  ]);

  res.json({
    skillsListed,
    bookingsCompleted,
    updatedAt: new Date().toISOString(),
  });
};

