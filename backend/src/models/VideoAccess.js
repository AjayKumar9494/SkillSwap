import mongoose from "mongoose";

const videoAccessSchema = new mongoose.Schema(
  {
    skill: { type: mongoose.Schema.Types.ObjectId, ref: "Skill", required: true, index: true },
    learner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    creditCost: { type: Number, required: true, min: 1 },
    unlockedAt: { type: Date, default: Date.now },
    meta: { type: Object },
  },
  { timestamps: true }
);

videoAccessSchema.index({ skill: 1, learner: 1 }, { unique: true });

export const VideoAccess = mongoose.model("VideoAccess", videoAccessSchema);

