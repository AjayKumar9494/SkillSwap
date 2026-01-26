import { validationResult } from "express-validator";
import { User } from "../models/User.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const handleValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.array().map((e) => e.msg).join(", ");
    const err = new Error(msg);
    err.statusCode = 400;
    throw err;
  }
};

export const getCurrentUser = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

export const updatePreferences = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { categories, location, mode, language } = req.body;
  req.user.preferences = {
    categories: categories || [],
    location: location || "",
    mode: mode || req.user.preferences?.mode,
    language: language || "",
  };
  await req.user.save();
  res.json({ user: req.user });
});

export const updateProfile = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { name } = req.body;
  if (name) req.user.name = name;
  await req.user.save();
  res.json({ user: req.user });
});

export const getPublicProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("name averageRating reviewsCount isOnline lastSeen");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

// PUT /api/users/me/last-seen - Update last seen timestamp
export const updateLastSeen = asyncHandler(async (req, res) => {
  req.user.lastSeen = new Date();
  await req.user.save();
  res.json({ message: "Last seen updated", lastSeen: req.user.lastSeen });
});
