import express from "express";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getSequences,
  createSequence,
  toggleSequence,
  getQueue,
  sendQueueItem,
  dismissQueueItem,
} from "../controllers/outreach.controller.js";
import { protect, requireOrg } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);
router.use(requireOrg);

// Template routes
router.get("/templates", getTemplates);
router.post("/templates", createTemplate);
router.put("/templates/:id", updateTemplate);
router.delete("/templates/:id", deleteTemplate);

// Sequence Cadence routes
router.get("/sequences", getSequences);
router.post("/sequences", createSequence);
router.put("/sequences/:id/toggle", toggleSequence);

// Queue routes
router.get("/queue", getQueue);
router.post("/queue/:id/send", sendQueueItem);
router.delete("/queue/:id", dismissQueueItem);

export default router;
