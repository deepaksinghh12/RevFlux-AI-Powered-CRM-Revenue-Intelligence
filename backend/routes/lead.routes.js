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
  assignLeads,
} from "../controllers/lead.controller.js";
import { protect, requireOrg } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import { checkLeadLimit } from "../middleware/plan.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { leadSchemas } from "../validators/schemas.js";

import { requireRole, requirePermission } from "../middleware/rbac.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = Router();

// All lead routes require authentication and an active organization
router.use(protect);
router.use(requireOrg);

router.route("/")
  .get(requirePermission(PERMISSIONS.LEADS_READ), getLeads)
  .post(requirePermission(PERMISSIONS.LEADS_CREATE), checkLeadLimit, validateBody(leadSchemas.create), createLead);

// Static routes placed before parameterized routes (/:id) to avoid route matching conflicts
router.post("/assign", requirePermission(PERMISSIONS.LEADS_ASSIGN), assignLeads);
router.post("/bulk", requirePermission(PERMISSIONS.LEADS_IMPORT), checkLeadLimit, importLeads);
router.patch("/reorder", requirePermission(PERMISSIONS.LEADS_UPDATE), reorderLeads);
router.put("/reorder", requirePermission(PERMISSIONS.LEADS_UPDATE), reorderLeads);

router.get("/:id/activity", requirePermission(PERMISSIONS.LEADS_READ), getLeadActivity);
router.post("/:id/send-email", requirePermission(PERMISSIONS.LEADS_UPDATE), sendLeadEmail);

// Attachment routes (must be before the generic /:id route)
router.route("/:id/attachments")
  .post(requirePermission(PERMISSIONS.LEADS_UPDATE), upload.single("file"), uploadAttachment);

router.route("/:id/attachments/:attachmentId")
  .delete(requirePermission(PERMISSIONS.LEADS_UPDATE), deleteAttachment);

router.route("/:id")
  .get(requirePermission(PERMISSIONS.LEADS_READ), getLead)
  .put(requirePermission(PERMISSIONS.LEADS_UPDATE), updateLead)
  .patch(requirePermission(PERMISSIONS.LEADS_UPDATE), updateLead)
  .delete(requirePermission(PERMISSIONS.LEADS_DELETE), deleteLead);

export default router;
