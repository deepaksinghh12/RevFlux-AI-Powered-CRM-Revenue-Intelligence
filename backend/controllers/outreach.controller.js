import { EmailTemplate } from "../models/EmailTemplate.js";
import { OutreachSequence, OutreachQueue } from "../models/OutreachSequence.js";
import Lead from "../models/Lead.js";
import { generateEmail } from "../services/ai.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { logActivity } from "../services/activity.service.js";

// Default templates seeded on first load
const DEFAULT_TEMPLATES = [
  {
    name: "Cold Prospecting Intro",
    category: "Cold Outreach",
    subject: "Unlocking growth for {{company}} with RevFlux AI",
    body: "Hi {{leadName}},\n\nI noticed {{company}} is expanding sales operations. Our team at RevFlux helps revenue leaders automate deal follow-ups and identify at-risk pipeline opportunities using Gemini AI.\n\nWould you be open to a 10-minute discovery call this Thursday?\n\nBest regards,\n{{repName}}",
    aiInstruction: "Friendly & value-focused cold pitch emphasizing AI revenue intelligence.",
    isDefault: true,
  },
  {
    name: "High-Value Proposal Follow-up",
    category: "Proposal",
    subject: "Following up on {{company}}'s customized proposal",
    body: "Hi {{leadName}},\n\nFollowing up on the proposal we shared for {{company}}. I wanted to ensure you had everything needed for team review.\n\nAre there any technical or pricing questions I can clarify before our end-of-quarter cutoff?\n\nBest,\n{{repName}}",
    aiInstruction: "Professional proposal follow-up with gentle deadline urgency.",
    isDefault: true,
  },
  {
    name: "Stale Lead Re-engagement",
    category: "Re-engagement",
    subject: "Re-connecting regarding {{company}}'s sales pipeline goals",
    body: "Hi {{leadName}},\n\nIt's been a few weeks since our last conversation. I understand priorities shift, but I wanted to check if improving pipeline conversion is still on {{company}}'s roadmap for this quarter.\n\nLet me know if next week works for a quick 5-minute sync!\n\nBest,\n{{repName}}",
    aiInstruction: "Warm, empathetic re-engagement tone for inactive leads.",
    isDefault: true,
  },
  {
    name: "Demo Booking Request",
    category: "Follow-up",
    subject: "15-min RevFlux AI Demo for {{company}}",
    body: "Hi {{leadName}},\n\nThanks for your interest in RevFlux! I'd love to walk you through how our hybrid AI risk scoring engine can help {{company}} close deals faster.\n\nDo you have 15 minutes available tomorrow morning?\n\nBest,\n{{repName}}",
    aiInstruction: "Direct, high-converting call-to-action to book a demo.",
    isDefault: true,
  },
];

// ===============================
// GET EMAIL TEMPLATES
// ===============================
export const getTemplates = asyncHandler(async (req, res) => {
  let templates = await EmailTemplate.find({ organization: req.organization._id }).sort({ createdAt: -1 });

  // Seed default templates if user has none
  if (templates.length === 0) {
    const seeded = DEFAULT_TEMPLATES.map((t) => ({ ...t, owner: req.user._id, organization: req.organization._id }));
    templates = await EmailTemplate.insertMany(seeded);
  }

  res.json({ success: true, count: templates.length, templates });
});

// ===============================
// CREATE TEMPLATE
// ===============================
export const createTemplate = asyncHandler(async (req, res) => {
  const { name, category, subject, body, aiInstruction } = req.body;
  if (!name || !subject || !body) {
    throw new ApiError(400, "Name, subject, and body are required for email templates");
  }

  const template = await EmailTemplate.create({
    owner: req.user._id, organization: req.organization._id,
    name,
    category: category || "Follow-up",
    subject,
    body,
    aiInstruction: aiInstruction || "",
  });

  res.status(201).json({ success: true, template });
});

// ===============================
// UPDATE TEMPLATE
// ===============================
export const updateTemplate = asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findOne({ _id: req.params.id, owner: req.user._id, organization: req.organization._id });
  if (!template) throw new ApiError(404, "Template not found");

  const { name, category, subject, body, aiInstruction } = req.body;
  if (name) template.name = name;
  if (category) template.category = category;
  if (subject) template.subject = subject;
  if (body) template.body = body;
  if (aiInstruction !== undefined) template.aiInstruction = aiInstruction;

  await template.save();
  res.json({ success: true, template });
});

// ===============================
// DELETE TEMPLATE
// ===============================
export const deleteTemplate = asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findOneAndDelete({ _id: req.params.id, owner: req.user._id, organization: req.organization._id });
  if (!template) throw new ApiError(404, "Template not found");
  res.json({ success: true, message: "Template deleted successfully" });
});

// ===============================
// GET OUTREACH SEQUENCES (CADENCES)
// ===============================
export const getSequences = asyncHandler(async (req, res) => {
  let sequences = await OutreachSequence.find({ organization: req.organization._id })
    .populate("template")
    .sort({ createdAt: -1 });

  // Seed default sequences if user has none
  if (sequences.length === 0) {
    const templates = await EmailTemplate.find({ organization: req.organization._id });
    const proposalTpl = templates.find((t) => t.category === "Proposal") || templates[0];
    const reengageTpl = templates.find((t) => t.category === "Re-engagement") || templates[0];

    if (proposalTpl && reengageTpl) {
      await OutreachSequence.create([
        {
          owner: req.user._id, organization: req.organization._id,
          name: "Proposal Stage Automated Cadence",
          triggerType: "stage_change",
          triggerStage: "Proposal",
          template: proposalTpl._id,
          isActive: true,
        },
        {
          owner: req.user._id, organization: req.organization._id,
          name: "At-Risk Deal Recovery Sequence",
          triggerType: "at_risk",
          riskThreshold: 60,
          template: reengageTpl._id,
          isActive: true,
        },
      ]);

      sequences = await OutreachSequence.find({ organization: req.organization._id })
        .populate("template")
        .sort({ createdAt: -1 });
    }
  }

  res.json({ success: true, count: sequences.length, sequences });
});

// ===============================
// CREATE SEQUENCE
// ===============================
export const createSequence = asyncHandler(async (req, res) => {
  const { name, triggerType, triggerStage, riskThreshold, templateId } = req.body;
  if (!name || !triggerType) {
    throw new ApiError(400, "Name and triggerType are required");
  }

  const sequence = await OutreachSequence.create({
    owner: req.user._id, organization: req.organization._id,
    name,
    triggerType,
    triggerStage: triggerStage || "Proposal",
    riskThreshold: riskThreshold || 60,
    template: templateId || null,
    isActive: true,
  });

  res.status(201).json({ success: true, sequence });
});

// ===============================
// TOGGLE SEQUENCE ACTIVE
// ===============================
export const toggleSequence = asyncHandler(async (req, res) => {
  const sequence = await OutreachSequence.findOne({ _id: req.params.id, owner: req.user._id, organization: req.organization._id });
  if (!sequence) throw new ApiError(404, "Sequence not found");

  sequence.isActive = !sequence.isActive;
  await sequence.save();

  res.json({ success: true, sequence });
});

// ===============================
// GET OUTREACH DRAFT QUEUE
// ===============================
export const getQueue = asyncHandler(async (req, res) => {
  const query = { organization: req.organization._id };
  if (req.membership && req.membership.role === 'rep') {
    query.owner = req.user._id;
  }

  const queue = await OutreachQueue.find(query)
    .populate("lead", "name company email status aiRiskScore value")
    .populate("sequence", "name triggerType")
    .sort({ createdAt: -1 });

  res.json({ success: true, count: queue.length, queue });
});

// ===============================
// SEND QUEUE ITEM
// ===============================
export const sendQueueItem = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id, organization: req.organization._id };
  if (req.membership && req.membership.role === 'rep') {
    query.owner = req.user._id;
  }

  const queueItem = await OutreachQueue.findOne(query);
  if (!queueItem) throw new ApiError(404, "Draft not found in queue or access denied");

  queueItem.status = "sent";
  queueItem.sentAt = new Date();
  await queueItem.save();

  res.json({ success: true, message: "Email draft marked as sent!", queueItem });

  logActivity({
    organization: req.organization._id,
    user: req.user._id,
    action: "EMAIL_SENT",
    entityType: "Lead",
    entityId: queueItem.lead,
    details: { subject: queueItem.subject }
  });
});

// ===============================
// DISMISS QUEUE ITEM
// ===============================
export const dismissQueueItem = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id, organization: req.organization._id };
  if (req.membership && req.membership.role === 'rep') {
    query.owner = req.user._id;
  }

  const queueItem = await OutreachQueue.findOneAndDelete(query);
  if (!queueItem) throw new ApiError(404, "Draft not found in queue or access denied");
  res.json({ success: true, message: "Draft dismissed from queue" });
});

// ===============================
// HELPER: TRIGGER CADENCE FOR LEAD
// Called internally when lead updates stage or becomes at-risk
// ===============================
export const triggerCadenceForLead = async ({ userId, lead, triggerType, newStage, riskScore }) => {
  try {
    const sequences = await OutreachSequence.find({ owner: userId, isActive: true }).populate("template");

    for (const seq of sequences) {
      let matched = false;
      let reason = "";

      if (triggerType === "stage_change" && seq.triggerType === "stage_change" && seq.triggerStage === newStage) {
        matched = true;
        reason = `Lead transitioned to ${newStage} stage`;
      } else if (triggerType === "at_risk" && seq.triggerType === "at_risk" && riskScore >= seq.riskThreshold) {
        matched = true;
        reason = `AI Risk Score reached ${riskScore} (Threshold: ${seq.riskThreshold})`;
      } else if (triggerType === "new_lead" && seq.triggerType === "new_lead") {
        matched = true;
        reason = `New lead created`;
      }

      if (matched) {
        // Prevent duplicate queue items for same lead & sequence in last 24h
        const recent = await OutreachQueue.findOne({
          owner: userId,
          lead: lead._id,
          sequence: seq._id,
          createdAt: { $gte: new Date(Date.now() - 86400000) },
        });

        if (!recent) {
          // Generate customized subject and body from template or AI
          let subject = seq.template?.subject || `Follow-up for ${lead.company}`;
          let body = seq.template?.body || `Hi ${lead.name},\n\nFollowing up on our recent discussion regarding ${lead.company}.`;

          // Simple handlebar variable replacement
          subject = subject
            .replace(/{{leadName}}/g, lead.name || "Customer")
            .replace(/{{company}}/g, lead.company || "your business")
            .replace(/{{repName}}/g, "Sales Team");

          body = body
            .replace(/{{leadName}}/g, lead.name || "Customer")
            .replace(/{{company}}/g, lead.company || "your business")
            .replace(/{{repName}}/g, "Sales Team");

          await OutreachQueue.create({
            owner: userId,
            lead: lead._id,
            sequence: seq._id,
            subject,
            body,
            status: "pending_review",
            triggerReason: reason,
          });

          seq.executionsCount += 1;
          await seq.save();
        }
      }
    }
  } catch (err) {
    console.error("Error triggering outreach cadence:", err);
  }
};
