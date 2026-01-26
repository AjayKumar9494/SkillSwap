import mongoose from "mongoose";

export const connectDB = async (mongoUri) => {
  try {
    if (!mongoUri) {
      throw new Error("MongoDB URI is required");
    }
    mongoose.set("strictQuery", true);
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("Mongo connection error:", err.message);
    process.exit(1);
  }
};

