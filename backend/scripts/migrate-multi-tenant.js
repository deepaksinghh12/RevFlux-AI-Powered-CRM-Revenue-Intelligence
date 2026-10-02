import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

// Models
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import { Lead } from "../models/Lead.js";
import { Contact } from "../models/Contact.js";
import { Task } from "../models/Task.js";
import { Note } from "../models/Note.js";

async function migrate() {
  console.log("Starting Multi-Tenant Migration...");

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    // Retrieve all users directly to capture deprecated fields
    // Lean prevents mongoose from dropping fields not in schema if we stripped them early
    const users = await User.find({}).lean();
    console.log(`Found ${users.length} users to migrate.`);

    for (const user of users) {
      console.log(`\nProcessing user: ${user.email}`);

      // 1. Find or create Organization
      let orgMembership = await OrganizationMembership.findOne({ user: user._id, role: "owner" }).populate("organization");
      let org;

      if (!orgMembership) {
        console.log(`  No existing owner membership found. Creating Organization...`);
        const orgName = user.company || `${user.name}'s Workspace`;
        org = await Organization.create({
          name: orgName,
          plan: user.plan || "free",
          subscriptionStatus: user.subscriptionStatus || "trialing",
          leadLimit: user.leadLimit || 50,
          aiCallCount: user.aiCallCount || 0,
          lastPaymentId: user.lastPaymentId || "",
          lastBilledAt: user.lastBilledAt || null,
        });

        // 2. Create Membership
        await OrganizationMembership.create({
          user: user._id,
          organization: org._id,
          role: "owner",
          status: "active",
        });
        console.log(`  -> Created Organization "${orgName}" (${org._id})`);
      } else {
        org = orgMembership.organization;
        console.log(`  -> Already has Organization "${org.name}" (${org._id})`);
      }

      // 3. Migrate Records (Leads, Contacts, Tasks, Notes)
      console.log(`  Updating CRM records to link to organization...`);
      
      const leadsRes = await Lead.updateMany(
        { owner: user._id, organization: { $exists: false } },
        { $set: { organization: org._id } }
      );
      if (leadsRes.modifiedCount > 0) console.log(`    - Migrated ${leadsRes.modifiedCount} Leads`);

      const contactsRes = await Contact.updateMany(
        { owner: user._id, organization: { $exists: false } },
        { $set: { organization: org._id } }
      );
      if (contactsRes.modifiedCount > 0) console.log(`    - Migrated ${contactsRes.modifiedCount} Contacts`);

      const tasksRes = await Task.updateMany(
        { owner: user._id, organization: { $exists: false } },
        { $set: { organization: org._id } }
      );
      if (tasksRes.modifiedCount > 0) console.log(`    - Migrated ${tasksRes.modifiedCount} Tasks`);

      const notesRes = await Note.updateMany(
        { owner: user._id, organization: { $exists: false } },
        { $set: { organization: org._id } }
      );
      if (notesRes.modifiedCount > 0) console.log(`    - Migrated ${notesRes.modifiedCount} Notes`);
    }

    console.log("\nMigration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

migrate();
