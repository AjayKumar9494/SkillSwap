import { Router } from "express";
import { body, param } from "express-validator";
import { getCurrentUser, getPublicProfile, updateLastSeen, updatePreferences, updateProfile } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/me", requireAuth, getCurrentUser);
router.put("/me/last-seen", requireAuth, updateLastSeen);

router.put(
  "/me/preferences",
  requireAuth,
  [
    body("categories").optional().isArray().withMessage("categories must be an array"),
    body("location").optional().isString(),
    body("language").optional().isString(),
    body("mode").optional().isIn(["online", "offline", "hybrid"]).withMessage("Invalid mode"),
  ],
  updatePreferences
);

router.put(
  "/me",
  requireAuth,
  [body("name").optional().isLength({ min: 2 }).withMessage("Name must be at least 2 characters")],
  updateProfile
);

router.get("/:id", [param("id").isMongoId().withMessage("Invalid id")], getPublicProfile);

export default router;

