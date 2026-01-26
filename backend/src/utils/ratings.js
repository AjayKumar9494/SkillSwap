import { Skill } from "../models/Skill.js";
import { User } from "../models/User.js";
import { Review } from "../models/Review.js";

export const refreshSkillRating = async (skillId) => {
  const agg = await Review.aggregate([
    { $match: { skill: skillId } },
    { $group: { _id: "$skill", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const { avg = 0, count = 0 } = agg[0] || {};
  await Skill.findByIdAndUpdate(skillId, { averageRating: avg, reviewsCount: count });
};

export const refreshTeacherRating = async (teacherId) => {
  const agg = await Review.aggregate([
    { $match: { teacher: teacherId } },
    { $group: { _id: "$teacher", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const { avg = 0, count = 0 } = agg[0] || {};
  await User.findByIdAndUpdate(teacherId, { averageRating: avg, reviewsCount: count });
};
