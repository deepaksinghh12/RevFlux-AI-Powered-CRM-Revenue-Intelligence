import { Router } from "express";
import { protect, requireOrg } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";
import {
  getOrganization,
  updateOrganization,
  deleteOrganization,
} from "../controllers/organization.controller.js";

const router = Router();

// All organization routes require authentication and an active organization context
router.use(protect);
router.use(requireOrg);

router.get("/", getOrganization);
router.put("/", requirePermission(PERMISSIONS.ORG_UPDATE_SETTINGS), updateOrganization);
router.delete("/", requirePermission(PERMISSIONS.ORG_DELETE), deleteOrganization);

export default router;
