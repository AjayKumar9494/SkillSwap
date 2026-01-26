import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["earn", "spend"], required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    balanceAfter: { type: Number },
    meta: { type: Object },
  },
  { timestamps: true }
);

transactionSchema.index({ createdAt: -1 });

export const Transaction = mongoose.model("Transaction", transactionSchema);

