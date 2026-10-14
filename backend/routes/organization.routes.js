import { Router } from "express";
import { protect, requireOrg } from "../middleware/auth.middleware.js";
import { requirePermission, requireRole } from "../middleware/rbac.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";
import { ApiError } from "../utils/apiError.js";
import {
  getOrganization,
  updateOrganization,
  deleteOrganization,
  getAuditLogs,
} from "../controllers/organization.controller.js";

const router = Router();

// All organization routes require authentication and an active organization context
router.use(protect);
router.use(requireOrg);

router.get("/", getOrganization);
router.get("/audit-logs", requireRole("owner", "admin"), getAuditLogs);
router.put("/", requirePermission(PERMISSIONS.ORG_UPDATE_SETTINGS), updateOrganization);
router.delete("/", (req, res, next) => {
  throw new ApiError(403, "Organization deletion is disabled in this phase.");
});

export default router;
