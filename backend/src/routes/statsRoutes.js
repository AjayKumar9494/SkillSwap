import { Router } from "express";
import { getPublicStats } from "../controllers/statsController.js";

const router = Router();

// Public landing-page stats (no auth)
router.get("/public", getPublicStats);

export default router;

