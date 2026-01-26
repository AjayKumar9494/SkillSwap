import { Transaction } from "../models/Transaction.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const listMyTransactions = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = { user: req.user._id };
  const [items, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Transaction.countDocuments(filter),
  ]);

  res.json({
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

