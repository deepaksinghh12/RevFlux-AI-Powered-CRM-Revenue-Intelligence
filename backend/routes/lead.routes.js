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
} from "../controllers/lead.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = Router();

// All lead routes require authentication
router.use(protect);

router.route("/")
  .get(getLeads)
  .post(createLead);

// Static routes placed before parameterized routes (/:id) to avoid route matching conflicts
router.post("/bulk", importLeads);
router.patch("/reorder", reorderLeads);
router.put("/reorder", reorderLeads);

router.post("/:id/send-email", sendLeadEmail);

router.route("/:id")
  .get(getLead)
  .put(updateLead)
  .patch(updateLead)
  .delete(deleteLead);

export default router;

router.route("/:id/attachments")
  .post(upload.single("file"), uploadAttachment);

router.route("/:id/attachments/:attachmentId")
  .delete(deleteAttachment);
