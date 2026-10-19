import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import User from "./models/User.js";
import Organization from "./models/Organization.js";
import OrganizationMembership from "./models/OrganizationMembership.js";
import { Lead } from "./models/Lead.js";
import { Contact } from "./models/Contact.js";
import { Note } from "./models/Note.js";
import { Task } from "./models/Task.js";

const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const daysAhead = (n) => new Date(Date.now() + n * 86400000);

// Generate 1 Full Year (12 months) of realistic dummy leads
const rawLeads = [
  // Current Month (0-30 days)
  { key: "l1", name: "Dribbble Design", company: "Acme Corp", status: "New", priority: "High", source: "Website", value: 89345, ageDays: 4 },
  { key: "l2", name: "Google Pay Integration", company: "Globex", status: "Qualified", priority: "High", source: "Referral", value: 124000, ageDays: 12 },
  { key: "l3", name: "Amazon Cloud Analytics", company: "Initech", status: "Proposal", priority: "Medium", source: "Cold Outreach", value: 32123, ageDays: 18 },
  { key: "l4", name: "Datadog Observability", company: "Stark Industries", status: "New", priority: "Medium", source: "Website", value: 45000, ageDays: 2 },
  { key: "l5", name: "Notion Enterprise", company: "Soylent", status: "New", priority: "Low", source: "Social", value: 12400, ageDays: 6 },
  { key: "l6", name: "Figma Team Seats", company: "Hooli", status: "Qualified", priority: "Medium", source: "Website", value: 54000, ageDays: 14 },
  { key: "l7", name: "Linear Workflow", company: "Pied Piper", status: "Proposal", priority: "High", source: "Referral", value: 98000, ageDays: 25 },

  // Month 2 (30-60 days)
  { key: "l8", name: "Stripe Billing Infrastructure", company: "Umbrella Co", status: "Won", priority: "High", source: "Event", value: 76500, ageDays: 45 },
  { key: "l9", name: "Airtable Automation", company: "Wayne Ent.", status: "Qualified", priority: "High", source: "Event", value: 67000, ageDays: 38 },
  { key: "l10", name: "Snowflake Data Warehouse", company: "Cyberdyne", status: "Proposal", priority: "High", source: "Referral", value: 152000, ageDays: 52 },
  { key: "l11", name: "Zoom Video API", company: "Oscorp", status: "New", priority: "Medium", source: "Cold Outreach", value: 26000, ageDays: 40 },

  // Month 3 (60-90 days)
  { key: "l12", name: "Slack Enterprise Grid", company: "Vehement", status: "Lost", priority: "Low", source: "Cold Outreach", value: 21000, ageDays: 75 },
  { key: "l13", name: "Asana Portfolio Sync", company: "Aperture Labs", status: "Qualified", priority: "Low", source: "Social", value: 30000, ageDays: 68 },
  { key: "l14", name: "GitLab CI/CD Runner", company: "LexCorp", status: "Lost", priority: "Low", source: "Website", value: 18000, ageDays: 82 },
  { key: "l15", name: "HubSpot Marketing Suite", company: "Tyrell Corp", status: "Won", priority: "Medium", source: "Event", value: 88000, ageDays: 70 },

  // Month 4 (90-120 days)
  { key: "l16", name: "Vercel Enterprise Edge", company: "Massive Dynamic", status: "Won", priority: "High", source: "Referral", value: 143000, ageDays: 105 },
  { key: "l17", name: "Postman API Gateway", company: "InGen", status: "Won", priority: "High", source: "Website", value: 92000, ageDays: 115 },
  { key: "l18", name: "Sentry Error Tracking", company: "E Corp", status: "Lost", priority: "Medium", source: "Cold Outreach", value: 34000, ageDays: 98 },

  // Month 5 (120-150 days)
  { key: "l19", name: "Twilio SMS Dispatch", company: "RDA Corp", status: "Won", priority: "High", source: "Event", value: 110000, ageDays: 135 },
  { key: "l20", name: "Intercom Customer Support", company: "Wonka Industries", status: "Won", priority: "Medium", source: "Referral", value: 64000, ageDays: 142 },

  // Month 6 (150-180 days)
  { key: "l21", name: "Databricks ML Platform", company: "Cyberdyne", status: "Won", priority: "High", source: "Website", value: 175000, ageDays: 165 },
  { key: "l22", name: "Mixpanel Product Analytics", company: "Acme Corp", status: "Won", priority: "Medium", source: "Social", value: 48000, ageDays: 172 },

  // Month 7 (180-210 days)
  { key: "l23", name: "Zendesk Ticketing", company: "Globex", status: "Won", priority: "High", source: "Referral", value: 130000, ageDays: 195 },
  { key: "l24", name: "Auth0 Single Sign-On", company: "Initech", status: "Lost", priority: "Low", source: "Cold Outreach", value: 29000, ageDays: 202 },

  // Month 8 (210-240 days)
  { key: "l25", name: "Segment CDP Sync", company: "Hooli", status: "Won", priority: "High", source: "Event", value: 155000, ageDays: 225 },
  { key: "l26", name: "Confluence Knowledge Base", company: "Pied Piper", status: "Won", priority: "Medium", source: "Website", value: 42000, ageDays: 235 },

  // Month 9 (240-270 days)
  { key: "l27", name: "MongoDB Atlas Migration", company: "Stark Industries", status: "Won", priority: "High", source: "Referral", value: 198000, ageDays: 255 },
  { key: "l28", name: "PagerDuty Incident Control", company: "Wayne Ent.", status: "Lost", priority: "Medium", source: "Cold Outreach", value: 51000, ageDays: 262 },

  // Month 10 (270-300 days)
  { key: "l29", name: "Fastly CDN Delivery", company: "Tyrell Corp", status: "Won", priority: "High", source: "Website", value: 162000, ageDays: 285 },
  { key: "l30", name: "Grafana Cloud Dashboards", company: "LexCorp", status: "Won", priority: "Medium", source: "Event", value: 73000, ageDays: 292 },

  // Month 11 (300-330 days)
  { key: "l31", name: "LaunchDarkly Feature Flags", company: "Massive Dynamic", status: "Won", priority: "High", source: "Referral", value: 125000, ageDays: 315 },
  { key: "l32", name: "Amplitude Behavioral Cohorts", company: "Oscorp", status: "Won", priority: "Medium", source: "Social", value: 58000, ageDays: 322 },

  // Month 12 (330-365 days)
  { key: "l33", name: "HashiCorp Terraform Scale", company: "Umbrella Co", status: "Won", priority: "High", source: "Website", value: 210000, ageDays: 345 },
  { key: "l34", name: "CrowdStrike Security Suite", company: "Cyberdyne", status: "Won", priority: "High", source: "Event", value: 189000, ageDays: 358 },
];

const rawContacts = [
  { key: "c1", name: "Olivia Bennett", title: "VP of Sales", company: "Acme Corp", tags: ["decision-maker", "warm"], favorite: true },
  { key: "c2", name: "Noah Carter", title: "CTO", company: "Globex", tags: ["technical", "champion"], favorite: true },
  { key: "c3", name: "Emma Walsh", title: "Procurement Manager", company: "Initech", tags: ["finance"], favorite: false },
  { key: "c4", name: "Liam Foster", title: "Founder", company: "Umbrella Co", tags: ["executive"], favorite: false },
  { key: "c5", name: "Ava Mitchell", title: "Head of Operations", company: "Hooli", tags: ["warm"], favorite: false },
  { key: "c6", name: "Ethan Brooks", title: "Product Lead", company: "Pied Piper", tags: ["champion", "technical"], favorite: true },
  { key: "c7", name: "Sophia Reed", title: "Marketing Director", company: "Wayne Ent.", tags: ["influencer"], favorite: false },
  { key: "c8", name: "Mason Hayes", title: "CFO", company: "Cyberdyne", tags: ["finance", "executive"], favorite: false },
  { key: "c9", name: "Isabella Diaz", title: "Head of Growth", company: "Stark Industries", tags: ["vip", "warm"], favorite: true },
  { key: "c10", name: "Lucas Park", title: "Engineering Manager", company: "Tyrell Corp", tags: ["technical"], favorite: false },
];

const rawNotes = [
  { leadKey: "l2", content: "Decision expected end of month. Loop in a solutions engineer for the technical review.", pinned: true, ageDays: 3 },
  { leadKey: "l3", content: "Pricing pushback on the Pro tier — prepare an ROI one-pager before the next call.", pinned: false, ageDays: 6 },
  { leadKey: "l7", content: "Champion is leaving the company; identify a backup stakeholder ASAP.", pinned: true, ageDays: 9 },
  { leadKey: "l10", content: "Security questionnaire + SOC 2 report requested. Sent to the trust center.", pinned: false, ageDays: 12 },
  { leadKey: "l1", content: "Great discovery call — strong interest in the analytics module.", pinned: false, ageDays: 1 },
  { leadKey: "l16", content: "Expansion likely next quarter — multi-year deal already signed.", pinned: false, ageDays: 18 },
  { leadKey: "l9", content: "Scheduling a technical deep-dive with the engineering team.", pinned: false, ageDays: 5 },
  { leadKey: "l5", content: "Early stage, budget unconfirmed. Re-engage in two weeks.", pinned: false, ageDays: 2 },
];

const rawTasks = [
  { leadKey: "l3", title: "Send proposal follow-up to Initech", priority: "High", status: "Pending", dueDays: -2 },
  { leadKey: "l9", title: "Schedule technical deep-dive with Wayne Ent.", priority: "Medium", status: "In Progress", dueDays: 3 },
  { leadKey: "l16", title: "Quarterly check-in with Massive Dynamic", priority: "Low", status: "Pending", dueDays: 7 },
  { leadKey: "l3", title: "Draft ROI one-pager for Initech", priority: "High", status: "Completed", dueDays: -4, completed: true },
  { leadKey: "l10", title: "Negotiate pricing with Cyberdyne", priority: "High", status: "Pending", dueDays: 0 },
  { leadKey: "l2", title: "Share case study with Globex", priority: "Medium", status: "Pending", dueDays: 1 },
  { leadKey: "l7", title: "Confirm contract redlines with Pied Piper", priority: "High", status: "In Progress", dueDays: -1 },
  { leadKey: "l11", title: "Book discovery call with Oscorp", priority: "Low", status: "Pending", dueDays: 5 },
];

const seedUserData = async (user) => {
  console.log(`\n🌱 Seeding 1 Year of CRM data for user: ${user.name} (${user.email})...`);

  // Ensure user has an Organization and active owner membership
  let membership = await OrganizationMembership.findOne({ user: user._id, status: "active" }).populate("organization");
  let org = membership?.organization;

  if (!org) {
    org = await Organization.findOne({ code: "DEMO" });
    if (!org) {
      org = await Organization.create({
        name: "Demo Workspace",
        code: "DEMO",
        plan: "growth",
        owner: user._id,
      });
    }

    membership = await OrganizationMembership.findOneAndUpdate(
      { user: user._id, organization: org._id },
      { role: "owner", status: "active" },
      { upsert: true, new: true }
    );
  }

  // Clear existing records for this user & organization
  await Promise.all([
    Lead.deleteMany({ owner: user._id, organization: org._id }),
    Contact.deleteMany({ owner: user._id, organization: org._id }),
    Note.deleteMany({ owner: user._id, organization: org._id }),
    Task.deleteMany({ owner: user._id, organization: org._id }),
  ]);

  // 1. Create Leads
  const leadMap = {};
  const orderCounters = { New: 0, Qualified: 0, Proposal: 0, Won: 0, Lost: 0 };

  for (const item of rawLeads) {
    const leadDoc = await Lead.create({
      organization: org._id,
      owner: user._id,
      name: item.name,
      company: item.company,
      email: `${item.name.toLowerCase().replace(/[^a-z]/g, "")}@${item.company.toLowerCase().replace(/[^a-z]/g, "")}.com`,
      phone: `+1 555 0${100 + parseInt(item.key.slice(1), 10)}`,
      status: item.status,
      priority: item.priority,
      source: item.source,
      value: item.value,
      notes: item.status === "Won" ? "Closed — annual contract signed." : "Active opportunity in the pipeline.",
      tags: ["saas", "enterprise"],
      order: orderCounters[item.status]++,
      aiSummary: item.status === "Won" ? "High-value closed deal with strong growth potential." : "",
      aiRiskScore: item.status === "Lost" ? 95 : item.status === "Won" ? 10 : 35,
      createdAt: daysAgo(item.ageDays),
      updatedAt: daysAgo(Math.max(0, Math.floor(item.ageDays / 4))),
    });
    leadMap[item.key] = leadDoc;
  }
  console.log(`✅ Created ${rawLeads.length} leads spanning 12 calendar months.`);

  // 2. Create Contacts
  const contactMap = {};
  for (const item of rawContacts) {
    const contactDoc = await Contact.create({
      organization: org._id,
      owner: user._id,
      name: item.name,
      title: item.title,
      company: item.company,
      email: `${item.name.split(" ")[0].toLowerCase()}@${item.company.toLowerCase().replace(/[^a-z]/g, "")}.com`,
      phone: `+1 555 0${100 + parseInt(item.key.slice(1), 10)}`,
      tags: item.tags,
      favorite: item.favorite,
      notes: item.favorite ? "Primary point of contact." : "",
      createdAt: daysAgo(parseInt(item.key.slice(1), 10) * 15),
    });
    contactMap[item.key] = contactDoc;
  }
  console.log(`✅ Created ${rawContacts.length} contacts.`);

  // 3. Create Notes
  for (const item of rawNotes) {
    const leadDoc = leadMap[item.leadKey];
    await Note.create({
      organization: org._id,
      owner: user._id,
      content: item.content,
      lead: leadDoc ? leadDoc._id : null,
      contact: null,
      pinned: item.pinned,
      createdAt: daysAgo(item.ageDays),
    });
  }
  console.log(`✅ Created ${rawNotes.length} notes.`);

  // 4. Create Tasks
  for (const item of rawTasks) {
    const leadDoc = leadMap[item.leadKey];
    const dueDate = item.dueDays >= 0 ? daysAhead(item.dueDays) : daysAgo(Math.abs(item.dueDays));
    await Task.create({
      organization: org._id,
      owner: user._id,
      title: item.title,
      description: "",
      status: item.status,
      priority: item.priority,
      dueDate,
      relatedLead: leadDoc ? leadDoc._id : null,
      completedAt: item.completed ? daysAgo(Math.abs(item.dueDays)) : null,
      createdAt: daysAgo(Math.abs(item.dueDays) + 3),
    });
  }
  console.log(`✅ Created ${rawTasks.length} tasks.`);
};

const runSeed = async () => {
  try {
    await connectDB();

    // Ensure default demo user exists
    let demoUser = await User.findOne({ email: "admin@gmail.com" });
    if (!demoUser) {
      demoUser = await User.create({
        name: "Admin User",
        email: "admin@gmail.com",
        password: "admin123",
        company: "RevFlux",
        role: "owner",
      });
      console.log("👤 Created demo user: Admin User (admin@gmail.com)");
    }

    // Seed 1 Year of data for Admin User
    await seedUserData(demoUser);

    // Also seed for any other registered users
    const otherUsers = await User.find({ email: { $ne: "admin@gmail.com" } });
    for (const other of otherUsers) {
      await seedUserData(other);
    }

    console.log("\n🚀 Seeding finished successfully! Your RevFlux dashboard now has 1 year of dummy pipeline data.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed script error:", err);
    process.exit(1);
  }
};

runSeed();
