// Quick test to verify server can start
import { connectDB } from "./src/config/db.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/skillswap";

console.log("Testing MongoDB connection...");
connectDB(MONGO_URI)
  .then(() => {
    console.log("✓ MongoDB connection successful!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("✗ MongoDB connection failed:", err.message);
    console.log("\nMake sure MongoDB is running on your system.");
    process.exit(1);
  });
