import jwt from "jsonwebtoken";
import { JWT_EXPIRES_IN } from "./constants.js";

export const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET || "devsecret", {
    expiresIn: JWT_EXPIRES_IN,
  });

export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || "devsecret");
};

export const setAuthCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};
