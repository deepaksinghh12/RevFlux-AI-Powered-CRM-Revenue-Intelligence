import express from "express";
import {
  getTeamMembers,
  inviteTeamMember,
  updateMemberRole,
  removeTeamMember,
} from "../controllers/team.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getTeamMembers);
router.post("/invite", requireRole("owner", "ops_head", "superadmin"), inviteTeamMember);
router.put("/:userId/role", requireRole("owner", "superadmin"), updateMemberRole);
router.delete("/:userId", requireRole("owner", "superadmin"), removeTeamMember);

export default router;
