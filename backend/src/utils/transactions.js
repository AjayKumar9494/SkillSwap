import { Transaction } from "../models/Transaction.js";

export const logTransaction = async ({ userId, type, amount, description, balanceAfter, meta }) => {
  await Transaction.create({
    user: userId,
    type,
    amount,
    description,
    balanceAfter,
    meta,
  });
};
