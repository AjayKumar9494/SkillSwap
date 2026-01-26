import { Router } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { fileURLToPath } from "url";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Always store uploads under backend/uploads, independent of process cwd
const videosDir = path.join(__dirname, "..", "..", "uploads", "videos");
const thumbnailsDir = path.join(__dirname, "..", "..", "uploads", "thumbnails");
fs.mkdirSync(videosDir, { recursive: true });
fs.mkdirSync(thumbnailsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, videosDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const id = crypto.randomBytes(12).toString("hex");
    cb(null, `${Date.now()}-${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 250 * 1024 * 1024 }, // 250MB
  fileFilter: (req, file, cb) => {
    const allowed = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only mp4, webm, ogg, mov videos are allowed"));
    }
    cb(null, true);
  },
});

// POST /api/uploads/video -> { url }
router.post("/video", requireAuth, upload.single("video"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Video file is required" });
  const url = `/uploads/videos/${req.file.filename}`;
  res.status(201).json({ url });
});

// Thumbnail upload configuration
const thumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, thumbnailsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const id = crypto.randomBytes(12).toString("hex");
    cb(null, `${Date.now()}-${id}${ext}`);
  },
});

const thumbnailUpload = multer({
  storage: thumbnailStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only jpeg, jpg, png, webp, gif images are allowed"));
    }
    cb(null, true);
  },
});

// POST /api/uploads/thumbnail -> { url }
router.post("/thumbnail", requireAuth, thumbnailUpload.single("thumbnail"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Thumbnail file is required" });
  const url = `/uploads/thumbnails/${req.file.filename}`;
  res.status(201).json({ url });
});

export default router;

