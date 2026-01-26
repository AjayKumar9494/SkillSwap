import { Router } from "express";
import { body, param } from "express-validator";
import {
  createSkill,
  deleteSkill,
  deleteSkillVideo,
  getSkill,
  getSkillVideoAccess,
  getSkillVideoViews,
  getMyVideoUnlocks,
  listSkills,
  streamSkillVideo,
  unlockSkillVideo,
  updateSkill,
} from "../controllers/skillController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { SKILL_CATEGORIES } from "../models/Skill.js";

const router = Router();

const skillValidators = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("category")
    .isIn(SKILL_CATEGORIES)
    .withMessage(`Category must be one of: ${SKILL_CATEGORIES.join(", ")}`),
  body("mode")
    .optional()
    .isIn(["online", "offline", "hybrid"])
    .withMessage("Mode must be online, offline, or hybrid"),
  body("videoUrl").optional().isString().trim().isLength({ max: 500 }).withMessage("videoUrl is invalid"),
  body("thumbnailUrl").optional().isString().trim().isLength({ max: 500 }).withMessage("thumbnailUrl is invalid"),
  body("creditCost").isInt({ min: 1 }).withMessage("creditCost must be >= 1"),
];

router.get("/", listSkills);

// Get user's video unlocks
router.get("/video-unlocks", requireAuth, getMyVideoUnlocks);

// Offline video unlock + streaming (declare before :id for readability)
router.get(
  "/:id/video-access",
  requireAuth,
  [param("id").isMongoId().withMessage("Invalid id"), validate],
  getSkillVideoAccess
);
router.get(
  "/:id/video-views",
  [param("id").isMongoId().withMessage("Invalid id"), validate],
  getSkillVideoViews
);
router.post(
  "/:id/unlock-video",
  requireAuth,
  [param("id").isMongoId().withMessage("Invalid id"), validate],
  unlockSkillVideo
);
router.get(
  "/:id/video-stream",
  [param("id").isMongoId().withMessage("Invalid id"), validate],
  streamSkillVideo
);
router.delete(
  "/:id/video",
  requireAuth,
  [param("id").isMongoId().withMessage("Invalid id"), validate],
  deleteSkillVideo
);

router.get("/:id", [param("id").isMongoId().withMessage("Invalid id"), validate], getSkill);

router.post("/", requireAuth, [...skillValidators, validate], createSkill);
router.put("/:id", requireAuth, [param("id").isMongoId().withMessage("Invalid id"), ...skillValidators, validate], updateSkill);
router.delete("/:id", requireAuth, [param("id").isMongoId().withMessage("Invalid id"), validate], deleteSkill);

export default router;

