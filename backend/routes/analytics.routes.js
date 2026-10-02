import { Router } from "express";
import { getOverview } from "../controllers/analytics.controller.js";
import { protect, requireOrg } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect);
router.use(requireOrg);

router.get("/overview", getOverview);

export default router;
