import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const preferencesSchema = new mongoose.Schema(
  {
    categories: [{ type: String }],
    location: { type: String },
    mode: { type: String, enum: ["online", "offline", "hybrid"], default: "online" },
    language: { type: String },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true },
    credits: { type: Number, default: 10 },
    preferences: { type: preferencesSchema, default: () => ({}) },
    lastLoginDate: { type: Date },
    averageRating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

export const User = mongoose.model("User", userSchema);

