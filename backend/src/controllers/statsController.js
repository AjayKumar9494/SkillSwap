import { Booking } from "../models/Booking.js";
import { Skill } from "../models/Skill.js";
import { User } from "../models/User.js";
import { BOOKING_STATUS } from "../utils/constants.js";

export const getPublicStats = async (req, res) => {
  const [skillsListed, bookingsCompleted, activeUsers] = await Promise.all([
    Skill.countDocuments({}),
    Booking.countDocuments({ status: BOOKING_STATUS.COMPLETED }),
    User.countDocuments({}),
  ]);

  res.json({
    skillsListed,
    bookingsCompleted,
    activeUsers,
    updatedAt: new Date().toISOString(),
  });
};

