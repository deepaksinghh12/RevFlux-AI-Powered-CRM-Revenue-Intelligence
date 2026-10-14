import express from "express";
import {
  getTeamMembers,
  inviteTeamMember,
  updateMemberRole,
  removeTeamMember,
} from "../controllers/team.controller.js";
import { protect, requireOrg } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";

const router = express.Router();

router.use(protect);
router.use(requireOrg);

router.get("/", requireRole("owner", "admin", "manager", "rep", "viewer"), getTeamMembers);
router.post("/invite", requireRole("owner", "admin"), inviteTeamMember);
router.put("/:userId/role", requireRole("owner"), updateMemberRole);
router.delete("/:userId", requireRole("owner"), removeTeamMember);

export default router;
