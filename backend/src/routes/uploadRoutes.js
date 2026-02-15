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
// Use absolute path to ensure persistence across deployments
const videosDir = path.join(__dirname, "..", "..", "uploads", "videos");
const thumbnailsDir = path.join(__dirname, "..", "..", "uploads", "thumbnails");

// Ensure directories exist and create .gitkeep to preserve them
fs.mkdirSync(videosDir, { recursive: true });
fs.mkdirSync(thumbnailsDir, { recursive: true });

// Create .gitkeep files to ensure directories persist
const gitkeepVideos = path.join(videosDir, ".gitkeep");
const gitkeepThumbnails = path.join(thumbnailsDir, ".gitkeep");
if (!fs.existsSync(gitkeepVideos)) {
  fs.writeFileSync(gitkeepVideos, "");
}
if (!fs.existsSync(gitkeepThumbnails)) {
  fs.writeFileSync(gitkeepThumbnails, "");
}

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
    const mimetype = (file.mimetype || "").toLowerCase();
    const ext = path.extname(file.originalname || "").toLowerCase();
    
    // Validate it's a video
    if (!mimetype.startsWith("video/")) {
      return cb(new Error("File must be a video (any video format is allowed)"));
    }
    
    // Warn about format compatibility but allow all formats
    // MP4 (H.264) is recommended for best browser compatibility
    const recommendedFormats = [".mp4", ".m4v", ".mov"];
    if (!recommendedFormats.includes(ext)) {
      console.warn(`Video uploaded with format ${ext} - MP4 (H.264) is recommended for best compatibility`);
    }
    
    cb(null, true);
  },
});

// POST /api/uploads/video -> { url }
router.post("/video", requireAuth, upload.single("video"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Video file is required" });
  
  // Verify file was actually saved
  const filePath = path.join(videosDir, req.file.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(500).json({ message: "Failed to save video file" });
  }
  
  // Get file stats to confirm it's saved
  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    return res.status(500).json({ message: "Video file is empty" });
  }
  
  const url = `/uploads/videos/${req.file.filename}`;
  res.status(201).json({ 
    url,
    filename: req.file.filename,
    size: stats.size,
    mimetype: req.file.mimetype
  });
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

