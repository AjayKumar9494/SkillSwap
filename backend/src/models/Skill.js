import mongoose from "mongoose";

const SKILL_CATEGORIES = ["Programming", "Design", "Marketing", "Music", "Fitness", "Academics"];

const skillSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, enum: SKILL_CATEGORIES, required: true, index: true },
    mode: { type: String, enum: ["online", "offline"], default: "online" },
    // For offline skills, teacher can upload a preview/lesson video
    videoUrl: { type: String, trim: true },
    // Thumbnail image for video (optional)
    thumbnailUrl: { type: String, trim: true },
    creditCost: { type: Number, required: true, min: 1 },
    averageRating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

skillSchema.index({ title: "text", description: "text" });

export const Skill = mongoose.model("Skill", skillSchema);
export { SKILL_CATEGORIES };

