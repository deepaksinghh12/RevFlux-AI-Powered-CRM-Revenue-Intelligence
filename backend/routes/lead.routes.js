import { Router } from "express";
import {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  reorderLeads,
  sendLeadEmail,
  importLeads,
  uploadAttachment,
  deleteAttachment,
  getLeadActivity,
} from "../controllers/lead.controller.js";
import { protect, requireOrg } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import { checkLeadLimit } from "../middleware/plan.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { leadSchemas } from "../validators/schemas.js";

import { requireRole } from "../middleware/rbac.middleware.js";

const router = Router();

// All lead routes require authentication and an active organization
router.use(protect);
router.use(requireOrg);

router.route("/")
  .get(getLeads)
  .post(checkLeadLimit, validateBody(leadSchemas.create), createLead);

// Static routes placed before parameterized routes (/:id) to avoid route matching conflicts
router.post("/bulk", requireRole("owner", "ops_head", "superadmin"), checkLeadLimit, importLeads);
router.patch("/reorder", reorderLeads);
router.put("/reorder", reorderLeads);

router.get("/:id/activity", getLeadActivity);
router.post("/:id/send-email", sendLeadEmail);

// Attachment routes (must be before the generic /:id route)
router.route("/:id/attachments")
  .post(upload.single("file"), uploadAttachment);

router.route("/:id/attachments/:attachmentId")
  .delete(deleteAttachment);

router.route("/:id")
  .get(getLead)
  .put(updateLead)
  .patch(updateLead)
  .delete(requireRole("owner", "ops_head", "superadmin"), deleteLead);

export default router;
