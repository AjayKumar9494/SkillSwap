import jwt from "jsonwebtoken";
import { asyncHandler } from "./asyncHandler.js";
import { User } from "../models/User.js";

export const requireAuth = asyncHandler(async (req, res, next) => {
  const bearer = req.headers.authorization;
  const token =
    (bearer && bearer.startsWith("Bearer ") && bearer.split(" ")[1]) ||
    req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
});

