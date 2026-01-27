import { validationResult } from "express-validator";
import { Skill } from "../models/Skill.js";
import { VideoAccess } from "../models/VideoAccess.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { logTransaction } from "../utils/transactions.js";
import { createNotification } from "../utils/notifications.js";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const videoAbsolutePathFromSkill = (skill) => {
  const url = skill?.videoUrl || "";
  const filename = String(url).split("/").pop();
  if (!filename) return null;
  return path.join(__dirname, "..", "..", "uploads", "videos", filename);
};

const getMimeFromFilename = (filename) => {
  const ext = (path.extname(filename || "") || "").toLowerCase();
  // Return proper MIME types for video formats
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  if (ext === ".ogg" || ext === ".ogv") return "video/ogg";
  if (ext === ".mov") return "video/quicktime";
  if (ext === ".avi") return "video/x-msvideo";
  if (ext === ".mkv") return "video/x-matroska";
  // Default to mp4 if extension is missing or unknown (most common format)
  return "video/mp4";
};

const authFromHeaderCookieOrQuery = async (req) => {
  const bearer = req.headers.authorization;
  const token =
    (bearer && bearer.startsWith("Bearer ") && bearer.split(" ")[1]) ||
    req.cookies?.token ||
    req.query?.token;

  if (!token) {
    const err = new Error("Authentication required");
    err.statusCode = 401;
    throw err;
  }

  const payload = jwt.verify(token, process.env.JWT_SECRET || "devsecret");
  const user = await User.findById(payload.userId);
  if (!user) {
    const err = new Error("Invalid token");
    err.statusCode = 401;
    throw err;
  }
  return user;
};

const handleValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.array().map((e) => e.msg).join(", ");
    const err = new Error(msg);
    err.statusCode = 400;
    throw err;
  }
};

export const createSkill = asyncHandler(async (req, res) => {
  handleValidation(req);
  const skill = await Skill.create({ ...req.body, owner: req.user._id });
  res.status(201).json(skill);
});

export const listSkills = asyncHandler(async (req, res) => {
  const { search, category, mode, location, page = 1, limit = 10, matchPreferences, owner } = req.query;
  const filter = {};

  if (owner) {
    filter.owner = owner;
  }

  if (search) {
    filter.$text = { $search: search };
  }
  if (category) filter.category = category;
  if (mode) filter.mode = mode;
  if (location) filter.location = location;

  if (matchPreferences === "true" && req.user?.preferences) {
    const prefs = req.user.preferences;
    if (prefs.categories?.length) filter.category = { $in: prefs.categories };
    if (prefs.mode) filter.mode = prefs.mode;
    if (prefs.location) filter.location = prefs.location;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Skill.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate("owner", "name averageRating"),
    Skill.countDocuments(filter),
  ]);
  res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

export const getSkill = asyncHandler(async (req, res) => {
  const skill = await Skill.findById(req.params.id).populate("owner", "name averageRating reviewsCount");
  if (!skill) return res.status(404).json({ message: "Skill not found" });
  res.json(skill);
});

// GET /api/skills/:id/video-views -> get view count for offline video
export const getSkillVideoViews = asyncHandler(async (req, res) => {
  const skill = await Skill.findById(req.params.id);
  if (!skill) return res.status(404).json({ message: "Skill not found" });
  if (skill.mode !== "offline") {
    return res.json({ views: 0 });
  }
  const views = await VideoAccess.countDocuments({ skill: skill._id });
  res.json({ views });
});

// GET /api/skills/:id/video-access  -> { hasAccess }
export const getSkillVideoAccess = asyncHandler(async (req, res) => {
  const skill = await Skill.findById(req.params.id);
  if (!skill) return res.status(404).json({ message: "Skill not found" });

  if (skill.mode !== "offline" || !skill.videoUrl) {
    return res.json({ hasAccess: false, reason: "no_video" });
  }

  // owner always has access
  if (String(skill.owner) === String(req.user._id)) {
    return res.json({ hasAccess: true, isOwner: true });
  }

  const access = await VideoAccess.findOne({ skill: skill._id, learner: req.user._id });
  return res.json({ hasAccess: !!access });
});

// POST /api/skills/:id/unlock-video  -> transfers credits immediately and grants access
export const unlockSkillVideo = asyncHandler(async (req, res) => {
  const skill = await Skill.findById(req.params.id);
  if (!skill) return res.status(404).json({ message: "Skill not found" });
  if (skill.mode !== "offline") {
    return res.status(400).json({ message: "This skill is not an offline video" });
  }
  if (!skill.videoUrl) {
    return res.status(400).json({ message: "No video uploaded for this skill yet" });
  }
  if (String(skill.owner) === String(req.user._id)) {
    return res.status(400).json({ message: "You own this skill" });
  }

  const existing = await VideoAccess.findOne({ skill: skill._id, learner: req.user._id });
  if (existing) {
    return res.json({ hasAccess: true, message: "Already unlocked" });
  }

  const cost = Number(skill.creditCost || 0);
  if (!cost || cost < 1) {
    return res.status(400).json({ message: "Invalid credit cost" });
  }

  const learner = await User.findById(req.user._id);
  const teacher = await User.findById(skill.owner);
  if (!learner || !teacher) return res.status(404).json({ message: "User not found" });

  if (learner.credits < cost) {
    return res.status(400).json({ message: "Insufficient credits" });
  }

  learner.credits -= cost;
  teacher.credits += cost;
  await Promise.all([learner.save(), teacher.save()]);

  await Promise.all([
    logTransaction({
      userId: learner._id,
      type: "spend",
      amount: cost,
      description: `Unlocked video: ${skill.title}`,
      balanceAfter: learner.credits,
      meta: { skill: skill._id, kind: "video_unlock" },
    }),
    logTransaction({
      userId: teacher._id,
      type: "earn",
      amount: cost,
      description: `Video watched: ${skill.title}`,
      balanceAfter: teacher.credits,
      meta: { skill: skill._id, kind: "video_unlock", learner: learner._id },
    }),
  ]);

  await VideoAccess.create({
    skill: skill._id,
    learner: learner._id,
    teacher: teacher._id,
    creditCost: cost,
  });

  // Notify teacher about video unlock
  await createNotification({
    userId: teacher._id,
    type: "video_unlocked",
    title: "Video Unlocked",
    message: `${learner.name} unlocked your video "${skill.title}" for ${cost} credits.`,
    meta: { skill: skill._id, learner: learner._id },
  });

  // Notify learner about successful unlock
  await createNotification({
    userId: learner._id,
    type: "video_unlocked",
    title: "Video Unlocked",
    message: `You successfully unlocked "${skill.title}" for ${cost} credits. Enjoy learning!`,
    meta: { skill: skill._id },
  });

  res.json({ hasAccess: true, message: "Video unlocked" });
});

// GET /api/skills/:id/video-stream?token=...  -> streams video if owner or unlocked
export const streamSkillVideo = asyncHandler(async (req, res) => {
  const authUser = await authFromHeaderCookieOrQuery(req);
  const skill = await Skill.findById(req.params.id);
  if (!skill) return res.status(404).json({ message: "Skill not found" });
  if (skill.mode !== "offline" || !skill.videoUrl) {
    return res.status(404).json({ message: "Video not found" });
  }

  const isOwner = String(skill.owner) === String(authUser._id);
  if (!isOwner) {
    const access = await VideoAccess.findOne({ skill: skill._id, learner: authUser._id });
    if (!access) return res.status(403).json({ message: "Unlock required" });
  }

  const filename = String(skill.videoUrl).split("/").pop();
  const filePath = videoAbsolutePathFromSkill(skill);
  if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ message: "Video file missing" });

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const contentType = getMimeFromFilename(filename);

  // Set CORS headers explicitly for video streaming
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Authorization");
  } else {
    // Allow all origins if no origin header (for direct access)
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (range) {
    const parts = String(range).replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
      return res.status(416).send("Requested range not satisfiable");
    }

    const chunkSize = end - start + 1;
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    res.setHeader("Content-Length", chunkSize);
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.setHeader("Content-Length", fileSize);
    fs.createReadStream(filePath).pipe(res);
  }
});

// DELETE /api/skills/:id/video  -> owner deletes video and clears field
export const deleteSkillVideo = asyncHandler(async (req, res) => {
  const skill = await Skill.findById(req.params.id);
  if (!skill) return res.status(404).json({ message: "Skill not found" });
  if (String(skill.owner) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not authorized" });
  }

  const filePath = videoAbsolutePathFromSkill(skill);
  const hadVideo = !!skill.videoUrl;

  // Get all video accesses before deleting them
  const videoAccesses = await VideoAccess.find({ skill: skill._id }).populate("learner", "credits");

  // Refund credits to all learners who unlocked the video
  const refundPromises = videoAccesses.map(async (access) => {
    const learner = await User.findById(access.learner._id || access.learner);
    if (!learner) return;

    const refundAmount = access.creditCost;
    learner.credits += refundAmount;
    await learner.save();

    // Log refund transaction
    await logTransaction({
      userId: learner._id,
      type: "earn",
      amount: refundAmount,
      description: `Video deleted - refund for ${skill.title}`,
      balanceAfter: learner.credits,
      meta: { skill: skill._id, kind: "video_deletion_refund" },
    });

    // Deduct from teacher
    const teacher = await User.findById(skill.owner);
    if (teacher) {
      teacher.credits = Math.max(0, teacher.credits - refundAmount);
      await teacher.save();

      await logTransaction({
        userId: teacher._id,
        type: "spend",
        amount: refundAmount,
        description: `Video deleted - refunded to learner for ${skill.title}`,
        balanceAfter: teacher.credits,
        meta: { skill: skill._id, kind: "video_deletion_refund" },
      });
    }
  });

  await Promise.all(refundPromises);

  // Delete thumbnail if exists
  if (skill.thumbnailUrl) {
    const thumbnailPath = path.join(__dirname, "..", "..", "uploads", "thumbnails", String(skill.thumbnailUrl).split("/").pop());
    if (fs.existsSync(thumbnailPath)) {
      try {
        fs.unlinkSync(thumbnailPath);
      } catch {
        // ignore filesystem delete errors
      }
    }
  }

  skill.videoUrl = "";
  skill.thumbnailUrl = "";
  await skill.save();
  await VideoAccess.deleteMany({ skill: skill._id });

  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore filesystem delete errors
    }
  }

  res.json({ 
    message: hadVideo ? "Video deleted and credits refunded" : "No video to delete",
    refundedCount: videoAccesses.length
  });
});

export const updateSkill = asyncHandler(async (req, res) => {
  handleValidation(req);
  const skill = await Skill.findById(req.params.id);
  if (!skill) return res.status(404).json({ message: "Skill not found" });
  if (String(skill.owner) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not authorized to edit this skill" });
  }
  Object.assign(skill, req.body);
  await skill.save();
  res.json(skill);
});

export const deleteSkill = asyncHandler(async (req, res) => {
  const skill = await Skill.findById(req.params.id);
  if (!skill) return res.status(404).json({ message: "Skill not found" });
  if (String(skill.owner) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not authorized to delete this skill" });
  }
  await skill.deleteOne();
  res.json({ message: "Skill deleted" });
});

// GET /api/skills/video-unlocks -> get all video unlocks for current user (as learner)
export const getMyVideoUnlocks = asyncHandler(async (req, res) => {
  const unlocks = await VideoAccess.find({ learner: req.user._id })
    .populate("skill", "title description category mode creditCost videoUrl thumbnailUrl")
    .populate("teacher", "name")
    .sort({ unlockedAt: -1 });
  res.json(unlocks);
});

// GET /api/skills/uploaded-videos -> get all offline videos uploaded by current user (as teacher)
export const getMyUploadedVideos = asyncHandler(async (req, res) => {
  const skills = await Skill.find({ 
    owner: req.user._id, 
    mode: "offline",
    videoUrl: { $exists: true, $ne: "" }
  })
    .populate("owner", "name")
    .sort({ createdAt: -1 });
  
  // Get view counts for each skill
  const skillsWithViews = await Promise.all(
    skills.map(async (skill) => {
      const viewsData = await VideoAccess.countDocuments({ skill: skill._id });
      return {
        skill: skill,
        views: viewsData,
        unlockedAt: skill.createdAt, // Use skill creation date
        teacher: skill.owner,
        creditCost: skill.creditCost
      };
    })
  );
  
  res.json(skillsWithViews);
});

// DELETE /api/skills/:id/video-access -> learner removes their video access (no refund)
export const removeVideoAccess = asyncHandler(async (req, res) => {
  const skill = await Skill.findById(req.params.id);
  if (!skill) return res.status(404).json({ message: "Skill not found" });
  
  // Find and delete the video access for this learner
  const videoAccess = await VideoAccess.findOne({ 
    skill: skill._id, 
    learner: req.user._id 
  });
  
  if (!videoAccess) {
    return res.status(404).json({ message: "Video access not found" });
  }
  
  await VideoAccess.deleteOne({ _id: videoAccess._id });
  
  res.json({ message: "Video access removed successfully" });
});
