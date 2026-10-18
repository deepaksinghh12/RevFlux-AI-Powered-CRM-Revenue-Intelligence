import "dotenv/config";
import mongoose from "mongoose";
import { runMemberIdBackfill } from "../utils/memberIdBackfill.js";

async function main() {
  const isExecute = process.argv.includes("--execute");
  const dryRun = !isExecute;

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("ERROR: MONGO_URI is not set in environment.");
    process.exit(1);
  }

  const lower = mongoUri.toLowerCase();
  const env = (process.env.NODE_ENV || "").toLowerCase();
  if (lower.includes("prod") || env.includes("prod")) {
    console.error("SAFETY ERROR: Cannot run backfill script against a production database without explicit deployment clearance.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log(`[Member ID Backfill] Connected to database: ${mongoose.connection.name}`);
  console.log(`[Member ID Backfill] Mode: ${dryRun ? "DRY-RUN (No DB modifications)" : "EXECUTE (Applying changes)"}`);

  const results = await runMemberIdBackfill({ dryRun });

  console.log("\n================ BACKFILL SUMMARY ================");
  console.log(`Total Organizations Examined : ${results.totalOrganizations}`);
  console.log(`Organizations Needing Updates: ${results.organizationsUpdated}`);
  console.log(`Memberships Examined         : ${results.membershipsExamined}`);
  console.log(`Memberships Preserved (Valid): ${results.membershipsPreserved}`);
  console.log(`Memberships Assigned New IDs : ${results.membershipsAssigned}`);
  console.log("==================================================\n");

  for (const d of results.details) {
    console.log(`Org: ${d.orgName} [Code: ${d.orgCode}] | Assigned: ${d.assignedCount}, Preserved: ${d.preservedCount}, NextSeq: ${d.nextMemberSeq}`);
    for (const a of d.assignments) {
      console.log(`  -> Member ID: ${a.memberId} (Role: ${a.role}, Membership: ${a.membershipId})`);
    }
  }

  if (dryRun) {
    console.log("\n[INFO] Dry-run complete. To apply these changes to the non-production database, run with '--execute'.");
  } else {
    console.log("\n[SUCCESS] Backfill successfully applied.");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
