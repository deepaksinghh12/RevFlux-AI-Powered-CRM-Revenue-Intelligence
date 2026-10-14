import { Router } from "express";
import { getOverview } from "../controllers/analytics.controller.js";
import { protect, requireOrg } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = Router();

router.use(protect);
router.use(requireOrg);

router.get("/overview", requirePermission(PERMISSIONS.REPORTS_READ), getOverview);

export default router;
