import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import Organization from "./models/Organization.js";
import OrganizationMembership from "./models/OrganizationMembership.js";
import Lead from "./models/Lead.js";
import { Contact } from "./models/Contact.js";
import { Task } from "./models/Task.js";
import { Note } from "./models/Note.js";
import { ActivityLog } from "./models/ActivityLog.js";

const QA_ORG_NAME = "RevFlux QA Workspace";
const QA_PASSWORD_RAW = "QAPassword123!";

const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const daysAhead = (n) => new Date(Date.now() + n * 86400000);

export const seedQAWorkspace = async ({ reset = false } = {}) => {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/revflux_dev";

  // Production protection check (Fail-closed: strictly requires development or test)
  const env = (process.env.NODE_ENV || "").toLowerCase().trim();
  const isExplicitDevOrTest = env === "development" || env === "test";
  const hasProdIndicator = env.includes("prod") || mongoUri.toLowerCase().includes("prod");

  if (!isExplicitDevOrTest || hasProdIndicator) {
    throw new Error("CRITICAL SAFETY CHECK FAILED: Cannot run QA seeding against a production environment or database.");
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
    console.log(`[QA Seed] Connected to MongoDB database: ${mongoose.connection.name}`);
  }

  // 1. Find or create the dedicated QA Workspace Organization
  let org = await Organization.findOne({ name: QA_ORG_NAME });
  if (!org) {
    org = await Organization.create({
      name: QA_ORG_NAME,
      code: "REVQA",
      plan: "growth",
      subscriptionStatus: "active",
      leadLimit: 500,
    });
    console.log(`[QA Seed] Created dedicated organization: "${QA_ORG_NAME}" (ID: ${org._id}, Code: REVQA)`);
  } else {
    if (!org.code) {
      org.code = "REVQA";
      await org.save();
    }
    console.log(`[QA Seed] Found existing organization: "${QA_ORG_NAME}" (ID: ${org._id}, Code: ${org.code})`);
  }

  // 2. Destructive reset option (strictly scoped to QA Workspace only)
  if (reset) {
    console.log(`[QA Seed] Performing scoped cleanup for organization "${QA_ORG_NAME}"...`);
    await Promise.all([
      Lead.deleteMany({ organization: org._id }),
      Contact.deleteMany({ organization: org._id }),
      Task.deleteMany({ organization: org._id }),
      Note.deleteMany({ organization: org._id }),
      ActivityLog.deleteMany({ organization: org._id }),
    ]);
    console.log(`[QA Seed] Scoped cleanup completed.`);
  }

  // 3. Seed QA Personas
  const personas = [
    { email: "qa.owner@revflux.local", name: "QA Owner", role: "owner", title: "Chief Revenue Officer" },
    { email: "qa.admin@revflux.local", name: "QA Admin", role: "admin", title: "VP of Revenue Operations" },
    { email: "qa.manager@revflux.local", name: "QA Manager", role: "manager", title: "Sales Development Manager" },
    { email: "qa.rep1@revflux.local", name: "QA Rep 1", role: "rep", title: "Senior Account Executive" },
    { email: "qa.rep2@revflux.local", name: "QA Rep 2", role: "rep", title: "Account Executive" },
    { email: "qa.viewer@revflux.local", name: "QA Viewer", role: "viewer", title: "Board Observer / Auditor" },
  ];

  const userMap = {};

  for (const p of personas) {
    let user = await User.findOne({ email: p.email });
    if (!user) {
      user = await User.create({
        name: p.name,
        email: p.email,
        password: QA_PASSWORD_RAW,
        jobTitle: p.title,
        department: "Sales",
        status: "active",
      });
      console.log(`[QA Seed] Created user: ${p.name} (${p.email})`);
    } else {
      user.name = p.name;
      user.password = QA_PASSWORD_RAW;
      user.status = "active";
      await user.save();
    }
    userMap[p.role === "rep" ? (p.email.includes("rep1") ? "rep1" : "rep2") : p.role] = user;

    // Ensure OrganizationMembership in QA Workspace
    let membership = await OrganizationMembership.findOne({
      user: user._id,
      organization: org._id,
    });

    if (!membership) {
      membership = await OrganizationMembership.create({
        user: user._id,
        organization: org._id,
        role: p.role,
        status: "active",
      });
      console.log(`[QA Seed] Assigned membership: ${p.name} as ${p.role.toUpperCase()}`);
    } else {
      membership.role = p.role;
      membership.status = "active";
      await membership.save();
    }
  }

  // 4. Seed QA Leads (Only if none exist or reset was specified)
  const existingLeadCount = await Lead.countDocuments({ organization: org._id });
  let leads = [];

  if (existingLeadCount === 0 || reset) {
    const rawLeads = [
      {
        name: "[QA] Cloud Scale Deal",
        company: "Acme QA Corp",
        email: "deals@acme-qa.com",
        phone: "+1 555 0101",
        status: "New",
        priority: "High",
        source: "Website",
        value: 85000,
        ownerKey: "rep1",
        tags: ["qa-verified", "enterprise"],
        notes: "Assigned strictly to Rep 1 for isolation testing.",
      },
      {
        name: "[QA] Enterprise Migration",
        company: "Globex QA Ltd",
        email: "contact@globex-qa.com",
        phone: "+1 555 0102",
        status: "Qualified",
        priority: "High",
        source: "Referral",
        value: 140000,
        ownerKey: "rep1",
        tags: ["qa-verified", "high-value"],
        notes: "Target lead for safe reassignment to Rep 2 or Manager.",
      },
      {
        name: "[QA] High-Risk Opportunity",
        company: "Initech QA Inc",
        email: "sales@initech-qa.com",
        phone: "+1 555 0103",
        status: "Proposal",
        priority: "Medium",
        source: "Cold Outreach",
        value: 45000,
        ownerKey: "rep1",
        tags: ["qa-verified"],
        notes: "Owned by Rep 1. Rep 2 should not be able to view or edit this.",
      },
      {
        name: "[QA] Private Security Contract",
        company: "Cyberdyne QA Systems",
        email: "security@cyberdyne-qa.com",
        phone: "+1 555 0104",
        status: "New",
        priority: "High",
        source: "Website",
        value: 120000,
        ownerKey: "rep2",
        tags: ["qa-verified", "confidential"],
        notes: "Owned strictly by Rep 2. Rep 1 should not see this in pipeline.",
      },
      {
        name: "[QA] Analytics Integration",
        company: "Wayne QA Enterprises",
        email: "data@wayne-qa.com",
        phone: "+1 555 0105",
        status: "Qualified",
        priority: "Medium",
        source: "Event",
        value: 65000,
        ownerKey: "rep2",
        tags: ["qa-verified"],
        notes: "Rep 2 pipeline record.",
      },
      {
        name: "[QA] Strategic Partnership",
        company: "Stark QA Labs",
        email: "partnerships@stark-qa.com",
        phone: "+1 555 0106",
        status: "Proposal",
        priority: "High",
        source: "Referral",
        value: 210000,
        ownerKey: "manager",
        tags: ["qa-verified", "executive"],
        notes: "Manager-owned opportunity.",
      },
      {
        name: "[QA] Won Expansion Deal",
        company: "Hooli QA Solutions",
        email: "renewals@hooli-qa.com",
        phone: "+1 555 0107",
        status: "Won",
        priority: "High",
        source: "Website",
        value: 180000,
        ownerKey: "owner",
        tags: ["qa-verified", "closed-won"],
        notes: "Closed contract under Owner account.",
      },
      {
        name: "[QA] Churned Prospect",
        company: "Pied Piper QA",
        email: "ops@piedpiper-qa.com",
        phone: "+1 555 0108",
        status: "Lost",
        priority: "Low",
        source: "Cold Outreach",
        value: 25000,
        ownerKey: "rep1",
        tags: ["qa-verified", "closed-lost"],
        notes: "Lost deal for pipeline reporting verification.",
      },
    ];

    for (const item of rawLeads) {
      const owner = userMap[item.ownerKey];
      const lead = await Lead.create({
        organization: org._id,
        owner: owner._id,
        name: item.name,
        company: item.company,
        email: item.email,
        phone: item.phone,
        status: item.status,
        priority: item.priority,
        source: item.source,
        value: item.value,
        notes: item.notes,
        tags: item.tags,
      });
      leads.push(lead);
    }
    console.log(`[QA Seed] Created ${leads.length} QA Leads.`);
  } else {
    leads = await Lead.find({ organization: org._id });
    console.log(`[QA Seed] Existing QA Leads found: ${leads.length}. (Skipping lead recreation)`);
  }

  // 5. Seed Contacts
  const existingContactCount = await Contact.countDocuments({ organization: org._id });
  if (existingContactCount === 0 || reset) {
    const rawContacts = [
      { name: "[QA] Sarah Connor", title: "CTO", company: "Cyberdyne QA Systems", email: "sarah@cyberdyne-qa.com", ownerKey: "rep2", tags: ["decision-maker"] },
      { name: "[QA] Bruce Wayne", title: "Managing Director", company: "Wayne QA Enterprises", email: "bruce@wayne-qa.com", ownerKey: "rep2", tags: ["vip"] },
      { name: "[QA] Tony Stark", title: "Chief Architect", company: "Stark QA Labs", email: "tony@stark-qa.com", ownerKey: "manager", tags: ["technical"] },
      { name: "[QA] Peter Parker", title: "Lead Researcher", company: "Acme QA Corp", email: "peter@acme-qa.com", ownerKey: "rep1", tags: ["champion"] },
    ];

    for (const c of rawContacts) {
      await Contact.create({
        organization: org._id,
        owner: userMap[c.ownerKey]._id,
        name: c.name,
        title: c.title,
        company: c.company,
        email: c.email,
        phone: "+1 555 0999",
        tags: c.tags,
      });
    }
    console.log(`[QA Seed] Created ${rawContacts.length} QA Contacts.`);
  }

  // 6. Seed Tasks
  const existingTaskCount = await Task.countDocuments({ organization: org._id });
  if (existingTaskCount === 0 || reset) {
    const leadMap = {};
    leads.forEach((l) => (leadMap[l.name] = l));

    const rawTasks = [
      { title: "[QA] Send technical spec to Cyberdyne", priority: "High", status: "In Progress", dueDays: 2, ownerKey: "rep2", lead: leadMap["[QA] Private Security Contract"] },
      { title: "[QA] Follow-up call with Acme QA", priority: "Medium", status: "Pending", dueDays: 4, ownerKey: "rep1", lead: leadMap["[QA] Cloud Scale Deal"] },
      { title: "[QA] Contract Review with Executive Board", priority: "High", status: "Pending", dueDays: 1, ownerKey: "manager", lead: leadMap["[QA] Strategic Partnership"] },
      { title: "[QA] Archive Won Deal Documents", priority: "Low", status: "Completed", dueDays: -2, ownerKey: "owner", lead: leadMap["[QA] Won Expansion Deal"] },
    ];

    for (const t of rawTasks) {
      await Task.create({
        organization: org._id,
        owner: userMap[t.ownerKey]._id,
        creator: userMap[t.ownerKey]._id,
        assignedTo: userMap[t.ownerKey]._id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDays >= 0 ? daysAhead(t.dueDays) : daysAgo(Math.abs(t.dueDays)),
        relatedLead: t.lead ? t.lead._id : null,
      });
    }
    console.log(`[QA Seed] Created ${rawTasks.length} QA Tasks.`);
  }

  // 7. Seed Notes
  const existingNoteCount = await Note.countDocuments({ organization: org._id });
  if (existingNoteCount === 0 || reset) {
    const leadMap = {};
    leads.forEach((l) => (leadMap[l.name] = l));

    const rawNotes = [
      { content: "[QA Note] Rep 1 discovery call: Client confirmed $85k budget allocation for Q4.", ownerKey: "rep1", lead: leadMap["[QA] Cloud Scale Deal"] },
      { content: "[QA Note] Rep 2 technical review: SOC 2 compliance requested before final signature.", ownerKey: "rep2", lead: leadMap["[QA] Private Security Contract"] },
      { content: "[QA Note] Manager review: Deal velocity is on track for Q4 board review.", ownerKey: "manager", lead: leadMap["[QA] Strategic Partnership"] },
    ];

    for (const n of rawNotes) {
      if (n.lead) {
        await Note.create({
          organization: org._id,
          owner: userMap[n.ownerKey]._id,
          author: userMap[n.ownerKey]._id,
          content: n.content,
          lead: n.lead._id,
        });
      }
    }
    console.log(`[QA Seed] Created ${rawNotes.length} QA Notes.`);
  }

  // 8. Seed Audit Log baseline entries
  const existingAuditCount = await ActivityLog.countDocuments({ organization: org._id });
  if (existingAuditCount === 0 || reset) {
    await ActivityLog.create({
      organization: org._id,
      user: userMap.owner._id,
      action: "MEMBER_ROLE_CHANGED",
      entityType: "OrganizationMembership",
      entityId: org._id,
      details: {
        targetName: "QA Manager",
        oldRole: "rep",
        newRole: "manager",
        note: "Initial QA environment role provisioning",
      },
    });

    await ActivityLog.create({
      organization: org._id,
      user: userMap.manager._id,
      action: "LEAD_ASSIGNED",
      entityType: "Lead",
      entityId: leads[0]?._id || org._id,
      details: {
        leadName: leads[0]?.name || "Sample QA Deal",
        targetEmail: "qa.rep1@revflux.local",
        note: "Initial pipeline setup",
      },
    });
    console.log(`[QA Seed] Seeded initial audit log history.`);
  }

  return {
    organization: {
      id: org._id.toString(),
      name: org.name,
      plan: org.plan,
    },
    personas: personas.map((p) => ({
      name: p.name,
      email: p.email,
      role: p.role,
      title: p.title,
      password: QA_PASSWORD_RAW,
    })),
    counts: {
      leads: await Lead.countDocuments({ organization: org._id }),
      contacts: await Contact.countDocuments({ organization: org._id }),
      tasks: await Task.countDocuments({ organization: org._id }),
      notes: await Note.countDocuments({ organization: org._id }),
      members: await OrganizationMembership.countDocuments({ organization: org._id }),
    },
  };
};

// Direct command-line runner
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("seed-qa.js")) {
  const isReset = process.argv.includes("--reset");
  seedQAWorkspace({ reset: isReset })
    .then((result) => {
      console.log("\n=======================================================");
      console.log("  🚀 RevFlux QA Workspace Seeded Successfully!");
      console.log("=======================================================");
      console.log(`Workspace Name: ${result.organization.name} (${result.organization.id})`);
      console.log(`Record Counts : ${result.counts.members} Members, ${result.counts.leads} Leads, ${result.counts.contacts} Contacts, ${result.counts.tasks} Tasks, ${result.counts.notes} Notes\n`);
      console.log("Available QA Personas (Password for all: QAPassword123!):");
      console.table(
        result.personas.map((p) => ({
          Role: p.role.toUpperCase(),
          Name: p.name,
          Email: p.email,
          Password: p.password,
        }))
      );
      console.log("=======================================================\n");
      process.exit(0);
    })
    .catch((err) => {
      console.error("\n❌ QA Seed Error:", err.message);
      process.exit(1);
    });
}
