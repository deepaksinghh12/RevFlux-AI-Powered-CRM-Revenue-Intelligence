import { Router } from "express";
import {
  getAiStatus,
  leadSummary,
  aiLead,
  generateEmailDraft,
  salesInsights,
  buildPipelineStatus,
  getAttentionLeads,
} from "../controllers/ai.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect);

router.get("/status", getAiStatus);
router.get("/attention", getAttentionLeads);
router.post("/lead-summary", leadSummary);
router.post("/lead", aiLead);
router.post("/lead/:id", aiLead);
router.post("/generate-email", generateEmailDraft);
router.post("/email-draft", generateEmailDraft);

router
  .route("/sales-insights")
  .get(salesInsights)
  .post(salesInsights);

router.get("/pipeline-status", async (req, res, next) => {
  try {
    const stats = await buildPipelineStatus(req.user._id);
    res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
});

export default router;
