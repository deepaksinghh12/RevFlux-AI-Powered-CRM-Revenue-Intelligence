import cron from "node-cron";
import Lead from "../models/Lead.js";

// Run every night at midnight: "0 0 * * *"
export const startAutoScoringJob = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("[Cron] Running nightly AI auto-scoring & stale check...");

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find leads that haven't been updated in 30 days and aren't Won/Lost
      const staleLeads = await Lead.find({
        updatedAt: { $lt: thirtyDaysAgo },
        status: { $nin: ["Won", "Lost"] },
      });

      if (staleLeads.length === 0) {
        console.log("[Cron] No stale leads found today.");
        return;
      }

      console.log(`[Cron] Found ${staleLeads.length} stale leads. Processing...`);

      // Bulk update them
      const bulkOps = staleLeads.map((lead) => {
        // INCREASE risk score for stale leads (higher = more at risk)
        // Use nullish coalescing to handle score of 0 correctly
        const currentScore = lead.aiRiskScore ?? 50;
        const newScore = Math.min(100, currentScore + 15);

        return {
          updateOne: {
            filter: { _id: lead._id },
            update: {
              $set: {
                priority: "Low",
                aiRiskScore: newScore,
                updatedAt: new Date(), // Prevent re-processing every night
              },
            },
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
