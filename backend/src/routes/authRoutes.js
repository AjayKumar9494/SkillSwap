import { Router } from "express";
import { body } from "express-validator";
import {
  forgotPassword,
  login,
  logout,
  me,
  register,
  resetPassword,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const emailValidator = body("email").isEmail().withMessage("Valid email is required");
const passwordValidator = body("password")
  .isLength({ min: 6 })
  .withMessage("Password must be at least 6 characters");

router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    emailValidator,
    passwordValidator,
    validate,
  ],
  register
);

router.post("/login", [emailValidator, passwordValidator, validate], login);

router.get("/me", requireAuth, me);

router.post("/logout", requireAuth, logout);

router.post("/forgot-password", [emailValidator, validate], forgotPassword);

router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Reset token is required"),
    passwordValidator,
    validate,
  ],
  resetPassword
);

export default router;

