import { Router } from "express";
import {
  getAiStatus,
  leadSummary,
  aiLead,
  generateEmailDraft,
  salesInsights,
  buildPipelineStatus,
  getAttentionLeads,
  copilotChat,
} from "../controllers/ai.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { aiRateLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();

router.use(protect);

router.post("/chat", aiRateLimiter, copilotChat);

router.get("/status", getAiStatus);
router.get("/attention", getAttentionLeads);
router.post("/lead-summary", aiRateLimiter, leadSummary);
router.post("/lead", aiRateLimiter, aiLead);
router.post("/lead/:id", aiRateLimiter, aiLead);
router.post("/generate-email", aiRateLimiter, generateEmailDraft);
router.post("/email-draft", aiRateLimiter, generateEmailDraft);

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
