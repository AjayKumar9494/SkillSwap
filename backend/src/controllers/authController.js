import crypto from "crypto";
import { validationResult } from "express-validator";
import { User } from "../models/User.js";
import { signToken, setAuthCookie } from "../utils/jwt.js";
import { DAILY_LOGIN_CREDIT, RESET_TOKEN_EXPIRES_MINUTES } from "../utils/constants.js";
import { logTransaction } from "../utils/transactions.js";
import { sendMail } from "../config/mailer.js";
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

const issueToken = (user, res) => {
  const token = signToken(user._id);
  setAuthCookie(res, token);
  return token;
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ message: "Email already registered" });
  }

  const user = await User.create({ name, email, password });
  const token = issueToken(user, res);

  res.status(201).json({ token, user });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const today = new Date().toDateString();
  let creditsAdded = 0;
  if (!user.lastLoginDate || user.lastLoginDate.toDateString() !== today) {
    user.credits += DAILY_LOGIN_CREDIT;
    user.lastLoginDate = new Date();
    creditsAdded = DAILY_LOGIN_CREDIT;
    await logTransaction({
      userId: user._id,
      type: "earn",
      amount: DAILY_LOGIN_CREDIT,
      description: "Daily login reward",
      balanceAfter: user.credits,
    });
  } else {
    user.lastLoginDate = new Date();
  }

  await user.save();
  const token = issueToken(user, res);

  res.json({ token, user, creditsAdded });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(200).json({ message: "If that email exists, a reset was sent" });
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashed = crypto.createHash("sha256").update(resetToken).digest("hex");
  user.resetPasswordToken = hashed;
  user.resetPasswordExpires = Date.now() + RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000;
  await user.save();

  const resetUrl = `${process.env.CLIENT_URL?.split(",")[0] || "http://localhost:5173"}/reset-password?token=${resetToken}`;
  await sendMail({
    to: email,
    subject: "SkillSwap Password Reset",
    html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Reset Password</a> (valid for ${RESET_TOKEN_EXPIRES_MINUTES} minutes)</p>`,
  });

  res.json({ message: "Password reset email sent" });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const hashed = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  // Password will be hashed automatically by the pre-save hook in User model
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  const jwtToken = issueToken(user, res);
  res.json({ token: jwtToken, user });
});
