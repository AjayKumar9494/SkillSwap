import { Router } from "express";
import { listMyTransactions } from "../controllers/transactionController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/mine", listMyTransactions);

export default router;

