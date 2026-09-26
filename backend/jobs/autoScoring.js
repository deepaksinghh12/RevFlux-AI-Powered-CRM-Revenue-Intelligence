import cron from "node-cron";
import Lead from "../models/Lead.js";

// Run every night at midnight: "0 0 * * *"
// For testing purposes, we could run it every minute "* * * * *" but let's stick to midnight.
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
        // Drop priority to Low
        let newPriority = "Low";
        
        // Lower AI score (arbitrary penalty for being ignored)
        let newScore = lead.aiRiskScore ? Math.max(0, lead.aiRiskScore - 15) : null;

        return {
          updateOne: {
            filter: { _id: lead._id },
            update: {
              $set: { 
                priority: newPriority,
                aiRiskScore: newScore
              },
            },
          },
        };
      });

      await Lead.bulkWrite(bulkOps);

      console.log("[Cron] Successfully updated stale leads.");
    } catch (err) {
      console.error("[Cron] Error running auto-scoring job:", err);
    }
  });

  console.log("🤖 Auto-scoring cron daemon initialized.");
};
