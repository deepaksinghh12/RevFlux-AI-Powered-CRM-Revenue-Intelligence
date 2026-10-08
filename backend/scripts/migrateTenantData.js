import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Models
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import { Lead } from "../models/Lead.js";
import { Contact } from "../models/Contact.js";
import { Note } from "../models/Note.js";
import { Task } from "../models/Task.js";
import EmailTemplate from "../models/EmailTemplate.js";
import { OutreachSequence, OutreachQueue } from "../models/OutreachSequence.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const isDryRun = process.argv.includes("--execute") ? false : true;

console.log("==================================================");
console.log(`🚀 REVFLUX TENANT DATA MIGRATION ${isDryRun ? "[DRY RUN]" : "[EXECUTE]"}`);
console.log("==================================================\n");

if (!isDryRun) {
  console.log("⚠️  WARNING: EXECUTING LIVE MIGRATION.");
  console.log("Ensure you have run mongodump before proceeding.\n");
} else {
  console.log("ℹ️  Running in DRY RUN mode. No data will be modified.");
  console.log("To execute, run: node backend/scripts/migrateTenantData.js --execute\n");
}

const report = {
  usersScanned: 0,
  opsHeadFound: 0,
  opsHeadMapped: 0,
  recordsMissingOrg: {
    Lead: 0,
    Contact: 0,
    Note: 0,
    Task: 0,
    EmailTemplate: 0,
    OutreachSequence: 0,
    OutreachQueue: 0,
  },
  safelyMappable: 0,
  ambiguous: 0,
  ambiguousDetails: []
};

const mapRecordsForModel = async (Model, modelName, userOrgMap) => {
  // If the schema lacks 'organization' altogether (like EmailTemplate currently),
  // $exists: false will match all records.
  const records = await Model.find({ organization: { $exists: false } });
  report.recordsMissingOrg[modelName] = records.length;

  for (const record of records) {
    if (!record.owner) {
      report.ambiguous++;
      report.ambiguousDetails.push({ model: modelName, id: record._id, reason: "No owner field" });
      continue;
    }

    const ownerIdStr = record.owner.toString();
    const userOrgs = userOrgMap[ownerIdStr];

    if (!userOrgs || userOrgs.length === 0) {
      report.ambiguous++;
      report.ambiguousDetails.push({ model: modelName, id: record._id, owner: ownerIdStr, reason: "Owner has no organizations" });
    } else if (userOrgs.length > 1) {
      report.ambiguous++;
      report.ambiguousDetails.push({ model: modelName, id: record._id, owner: ownerIdStr, reason: "Owner belongs to multiple organizations" });
    } else {
      report.safelyMappable++;
      if (!isDryRun) {
        // Fallback mapping
        record.organization = userOrgs[0];
        // We use updateOne to bypass any schema validation that might fail during migration
        await Model.updateOne({ _id: record._id }, { $set: { organization: userOrgs[0] } });
      }
    }
  }
};

const runMigration = async () => {
  try {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is missing in .env");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // 1. Build User -> Org mapping
    const memberships = await OrganizationMembership.find({ status: { $in: ["active", "suspended"] } });
    const userOrgMap = {};
    
    for (const m of memberships) {
      const uId = m.user.toString();
      if (!userOrgMap[uId]) userOrgMap[uId] = [];
      userOrgMap[uId].push(m.organization);
    }

    // 2. Scan and map roles (ops_head -> admin)
    const opsHeadMemberships = await OrganizationMembership.find({ role: "ops_head" });
    report.opsHeadFound = opsHeadMemberships.length;
    
    for (const m of opsHeadMemberships) {
      if (!isDryRun) {
        m.role = "admin";
        await m.save();
      }
      report.opsHeadMapped++;
    }

    // 3. Map missing organizations
    await mapRecordsForModel(Lead, "Lead", userOrgMap);
    await mapRecordsForModel(Contact, "Contact", userOrgMap);
    await mapRecordsForModel(Note, "Note", userOrgMap);
    await mapRecordsForModel(Task, "Task", userOrgMap);
    await mapRecordsForModel(EmailTemplate, "EmailTemplate", userOrgMap);
    await mapRecordsForModel(OutreachSequence, "OutreachSequence", userOrgMap);
    await mapRecordsForModel(OutreachQueue, "OutreachQueue", userOrgMap);

    // 4. Output Report
    console.log("\n📊 MIGRATION READINESS REPORT");
    console.log("--------------------------------------------------");
    console.log(`Ops_Head Roles Found: ${report.opsHeadFound} -> Mapped to Admin: ${report.opsHeadMapped}`);
    console.log("\nRecords missing 'organization' field:");
    for (const [key, val] of Object.entries(report.recordsMissingOrg)) {
      console.log(`  - ${key}: ${val}`);
    }
    
    console.log("\nMapping Resolution:");
    console.log(`  ✅ Safely Mappable (1:1 owner-org): ${report.safelyMappable}`);
    console.log(`  ⚠️ Ambiguous/Orphaned (Requires manual intervention): ${report.ambiguous}`);

    if (report.ambiguous > 0) {
      const reportPath = path.resolve(__dirname, "ambiguous_records_report.json");
      fs.writeFileSync(reportPath, JSON.stringify(report.ambiguousDetails, null, 2));
      console.log(`\n📄 Saved details of ${report.ambiguous} ambiguous records to: ${reportPath}`);
    }

    if (isDryRun) {
      console.log("\n✅ Dry run complete. No data was modified.");
      console.log("Before executing, verify the backup procedure below:");
      console.log("   mongodump --uri=\"$MONGO_URI\" --out=\"./backup_$(date +%F)\"");
    } else {
      console.log("\n✅ Execution complete. Safely mapped records have been updated.");
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Migration Error:", err);
    process.exit(1);
  }
};

runMigration();
