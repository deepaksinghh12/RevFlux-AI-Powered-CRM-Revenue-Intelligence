import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import User from "./models/User.js";
import { Lead } from "./models/Lead.js";
import { Contact } from "./models/Contact.js";
import { Note } from "./models/Note.js";
import { Task } from "./models/Task.js";

const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const daysAhead = (n) => new Date(Date.now() + n * 86400000);

const rawLeads = [
  { key: "l1", name: "Dribbble Design", company: "Acme Corp", status: "New", priority: "High", source: "Website", value: 89345, ageDays: 8 },
  { key: "l2", name: "Google Pay", company: "Globex", status: "Qualified", priority: "High", source: "Referral", value: 124000, ageDays: 20 },
  { key: "l3", name: "Amazon Shopping", company: "Initech", status: "Proposal", priority: "Medium", source: "Cold Outreach", value: 32123, ageDays: 35 },
  { key: "l4", name: "Stripe", company: "Umbrella Co", status: "Won", priority: "High", source: "Event", value: 76500, ageDays: 60 },
  { key: "l5", name: "Notion", company: "Soylent", status: "New", priority: "Low", source: "Social", value: 12400, ageDays: 4 },
  { key: "l6", name: "Figma", company: "Hooli", status: "Qualified", priority: "Medium", source: "Website", value: 54000, ageDays: 14 },
  { key: "l7", name: "Linear", company: "Pied Piper", status: "Proposal", priority: "High", source: "Referral", value: 98000, ageDays: 28 },
  { key: "l8", name: "Slack", company: "Vehement", status: "Lost", priority: "Low", source: "Cold Outreach", value: 21000, ageDays: 95 },
  { key: "l9", name: "Vercel", company: "Massive Dynamic", status: "Won", priority: "High", source: "Referral", value: 143000, ageDays: 110 },
  { key: "l10", name: "Airtable", company: "Wayne Ent.", status: "Qualified", priority: "High", source: "Event", value: 67000, ageDays: 18 },
  { key: "l11", name: "Datadog", company: "Stark Industries", status: "New", priority: "Medium", source: "Website", value: 45000, ageDays: 2 },
  { key: "l12", name: "Snowflake", company: "Cyberdyne", status: "Proposal", priority: "High", source: "Referral", value: 152000, ageDays: 48 },
  { key: "l13", name: "HubSpot", company: "Tyrell Corp", status: "Won", priority: "Medium", source: "Event", value: 88000, ageDays: 150 },
  { key: "l14", name: "Asana", company: "Aperture Labs", status: "Qualified", priority: "Low", source: "Social", value: 30000, ageDays: 22 },
  { key: "l15", name: "Zoom", company: "Oscorp", status: "New", priority: "Medium", source: "Cold Outreach", value: 26000, ageDays: 6 },
  { key: "l16", name: "GitLab", company: "LexCorp", status: "Lost", priority: "Low", source: "Website", value: 18000, ageDays: 70 },
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
  { key: "c9", name: "Isabella Diaz", title: "Head of Growth", company: "Stark Industries", tags: ["vip", "warm"], favorite: false },
  { key: "c10", name: "Lucas Park", title: "Engineering Manager", company: "Tyrell Corp", tags: ["technical"], favorite: false },
];

const rawNotes = [
  { leadKey: "l2", content: "Decision expected end of month. Loop in a solutions engineer for the technical review.", pinned: true, ageDays: 3 },
  { leadKey: "l3", content: "Pricing pushback on the Pro tier — prepare an ROI one-pager before the next call.", pinned: false, ageDays: 6 },
  { leadKey: "l7", content: "Champion is leaving the company; identify a backup stakeholder ASAP.", pinned: true, ageDays: 9 },
  { leadKey: "l12", content: "Security questionnaire + SOC 2 report requested. Sent to the trust center.", pinned: false, ageDays: 12 },
  { leadKey: "l1", content: "Great discovery call — strong interest in the analytics module.", pinned: false, ageDays: 1 },
  { leadKey: "l9", content: "Expansion likely next quarter — multi-year deal already signed.", pinned: false, ageDays: 18 },
  { leadKey: "l10", content: "Scheduling a technical deep-dive with the engineering team.", pinned: false, ageDays: 5 },
  { leadKey: "l5", content: "Early stage, budget unconfirmed. Re-engage in two weeks.", pinned: false, ageDays: 2 },
];

const rawTasks = [
  { leadKey: "l3", title: "Send proposal follow-up to Initech", priority: "High", status: "Pending", dueDays: -2 },
  { leadKey: "l10", title: "Schedule technical deep-dive with Wayne Ent.", priority: "Medium", status: "In Progress", dueDays: 3 },
  { leadKey: "l9", title: "Quarterly check-in with Massive Dynamic", priority: "Low", status: "Pending", dueDays: 7 },
  { leadKey: "l3", title: "Draft ROI one-pager for Initech", priority: "High", status: "Completed", dueDays: -4, completed: true },
  { leadKey: "l12", title: "Negotiate pricing with Cyberdyne", priority: "High", status: "Pending", dueDays: 0 },
  { leadKey: "l2", title: "Share case study with Globex", priority: "Medium", status: "Pending", dueDays: 1 },
  { leadKey: "l7", title: "Confirm contract redlines with Pied Piper", priority: "High", status: "In Progress", dueDays: -1 },
  { leadKey: "l15", title: "Book discovery call with Oscorp", priority: "Low", status: "Pending", dueDays: 5 },
  { leadKey: "l12", title: "Send security docs to Cyberdyne", priority: "Medium", status: "Completed", dueDays: -8, completed: true },
  { leadKey: "l5", title: "Re-engage stalled deal at Soylent", priority: "Low", status: "Pending", dueDays: 14 },
];

const seedUserData = async (user) => {
  console.log(`\n🌱 Seeding CRM data for user: ${user.name} (${user.email})...`);

  // Clear existing records for this user
  await Promise.all([
    Lead.deleteMany({ owner: user._id }),
    Contact.deleteMany({ owner: user._id }),
    Note.deleteMany({ owner: user._id }),
    Task.deleteMany({ owner: user._id }),
  ]);

  // 1. Create Leads
  const leadMap = {};
  const orderCounters = { New: 0, Qualified: 0, Proposal: 0, Won: 0, Lost: 0 };

  for (const item of rawLeads) {
    const leadDoc = await Lead.create({
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
      tags: ["saas"],
      order: orderCounters[item.status]++,
      aiSummary: item.status === "Won" ? "High-value closed deal with strong growth potential." : "",
      aiRiskScore: item.status === "Lost" ? 95 : item.status === "Won" ? 10 : 35,
      createdAt: daysAgo(item.ageDays),
      updatedAt: daysAgo(Math.max(0, Math.floor(item.ageDays / 4))),
    });
    leadMap[item.key] = leadDoc;
  }
  console.log(`✅ Created ${rawLeads.length} leads.`);

  // 2. Create Contacts
  const contactMap = {};
  for (const item of rawContacts) {
    const contactDoc = await Contact.create({
      owner: user._id,
      name: item.name,
      title: item.title,
      company: item.company,
      email: `${item.name.split(" ")[0].toLowerCase()}@${item.company.toLowerCase().replace(/[^a-z]/g, "")}.com`,
      phone: `+1 555 0${100 + parseInt(item.key.slice(1), 10)}`,
      tags: item.tags,
      favorite: item.favorite,
      notes: item.favorite ? "Primary point of contact." : "",
      createdAt: daysAgo(parseInt(item.key.slice(1), 10) * 7),
    });
    contactMap[item.key] = contactDoc;
  }
  console.log(`✅ Created ${rawContacts.length} contacts.`);

  // 3. Create Notes
  for (const item of rawNotes) {
    const leadDoc = leadMap[item.leadKey];
    await Note.create({
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
      owner: user._id,
      title: item.title,
      description: "",
      status: item.status,
      priority: item.priority,
      dueDate,
      relatedLead: leadDoc ? leadDoc._id : null,
      relatedContact: null,
      completedAt: item.completed ? daysAgo(1) : null,
    });
  }
  console.log(`✅ Created ${rawTasks.length} tasks.`);
};

const runSeed = async () => {
  try {
    await connectDB();

    // 1. Ensure default demo user exists
    let demoUser = await User.findOne({ email: "alex@timetoprogram.com" });
    if (!demoUser) {
      demoUser = await User.create({
        name: "Alex Carter",
        email: "alex@revflux.com",
        password: "Test@1234",
        company: "RevFlux",
        role: "owner",
      });
      console.log("👤 Created demo user: Alex Carter (alex@revflux.com)");
    }

    // Seed data for Alex Carter
    await seedUserData(demoUser);

    // Also seed for any other registered users (e.g. admin@example.com)
    const otherUsers = await User.find({ email: { $ne: "alex@revflux.com" } });
    for (const other of otherUsers) {
      await seedUserData(other);
    }

    console.log("\n🚀 Seeding finished successfully! Your CRM dashboard is now fully populated.\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error while seeding database:", err);
    process.exit(1);
  }
};

runSeed();
