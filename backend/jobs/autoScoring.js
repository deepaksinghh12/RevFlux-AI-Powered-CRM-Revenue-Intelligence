import cron from "node-cron";
import Lead from "../models/Lead.js";
import { triggerCadenceForLead } from "../controllers/outreach.controller.js";

// Run every night at midnight: "0 0 * * *"
export const startAutoScoringJob = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("[Cron] Running nightly AI auto-scoring & stale check...");

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find leads that haven't been updated in 30 days, aren't Won/Lost, and aren't soft-deleted
      const staleLeads = await Lead.find({
        updatedAt: { $lt: thirtyDaysAgo },
        status: { $nin: ["Won", "Lost"] },
        isDeleted: { $ne: true },
        $or: [
          { lastAutoScoredAt: { $exists: false } },
          { lastAutoScoredAt: null },
          { lastAutoScoredAt: { $lt: thirtyDaysAgo } },
        ],
      });

      if (staleLeads.length === 0) {
        console.log("[Cron] No stale leads found today.");
        return;
      }

      console.log(`[Cron] Found ${staleLeads.length} stale leads. Processing...`);

      // Bulk update them without demoting priority or resetting human updatedAt
      const bulkOps = staleLeads.map((lead) => {
        // INCREASE risk score for stale leads (higher = more at risk)
        const currentScore = lead.aiRiskScore ?? 50;
        const newScore = Math.min(100, currentScore + 15);

        // Trigger automated cadence for at-risk lead
        triggerCadenceForLead({
          userId: lead.owner,
          lead,
          triggerType: "at_risk",
          riskScore: newScore,
        }).catch((err) => console.error("[Cron] Failed to trigger cadence for lead:", err));

        return {
          updateOne: {
            filter: { _id: lead._id },
            update: {
              $set: {
                aiRiskScore: newScore,
                lastAutoScoredAt: new Date(),
              },
            },
            timestamps: false,
          },
        };
      });

      await Lead.bulkWrite(bulkOps);

      console.log(`[Cron] Successfully updated ${staleLeads.length} stale leads.`);
    } catch (err) {
      console.error("[Cron] Error running auto-scoring job:", err);
    }
  });

  console.log("🤖 Auto-scoring cron daemon initialized (runs at midnight daily).");
};
