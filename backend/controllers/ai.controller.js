import Lead from "../models/Lead.js";
import { Task } from "../models/Task.js";
import {
  isAIConfigured,
  generateLeadSummary,
  generateEmail,
  generateSalesInsights,
} from "../services/ai.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

// ===============================
// HELPER: RESOLVE LEAD
// ===============================
export const resolveLead = async (req) => {
  const leadId = req.body?.leadId || req.params?.id || req.body?.id;

  if (leadId) {
    const lead = await Lead.findOne({ _id: leadId, owner: req.user._id, organization: req.organization._id });
    if (!lead) {
      throw new ApiError(404, "Lead not found");
    }
    return lead;
  }

  if (req.body?.lead && typeof req.body.lead === "object") {
    return req.body.lead;
  }

  if (req.body?.name) {
    return req.body;
  }

  throw new ApiError(400, "Lead details or leadId is required");
};

// ===============================
// AI STATUS
// ===============================
export const getAiStatus = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    configured: isAIConfigured(),
    model: process.env.OPENROUTER_MODEL || "gpt-4o-mini",
  });
});

export const aiStatus = getAiStatus;

// ===============================
// AI LEAD ANALYSIS & PERSISTENCE
// ===============================
export const aiLead = asyncHandler(async (req, res) => {
  const lead = await resolveLead(req);
  const result = await generateLeadSummary(lead);

  // If this is a saved MongoDB document, persist the AI score and summary
  if (lead && typeof lead.save === "function") {
    lead.aiSummary = result.summary;
    lead.aiRiskScore = result.aiRiskScore;
    await lead.save();
  }

  res.json({
    success: true,
    lead,
    ...result,
  });
});

// ===============================
// LEAD SUMMARY
// ===============================
export const leadSummary = asyncHandler(async (req, res) => {
  const lead = await resolveLead(req);
  const result = await generateLeadSummary(lead);

  if (lead && typeof lead.save === "function") {
    lead.aiSummary = result.summary;
    lead.aiRiskScore = result.aiRiskScore;
    await lead.save();
  }

  res.json({
    success: true,
    ...result,
  });
});

// ===============================
// GENERATE EMAIL DRAFT
// ===============================
export const generateEmailDraft = asyncHandler(async (req, res) => {
  const { purpose, tone, lead: rawLead, leadId } = req.body;

  let lead = rawLead;
  if (leadId || (!lead && req.body?.name)) {
    try {
      lead = await resolveLead(req);
    } catch {
      lead = rawLead || {};
    }
  }

  const sender = {
    name: req.user?.name,
    company: req.user?.company,
    email: req.user?.email,
  };

  const draft = await generateEmail(lead, purpose, tone, sender);

  res.json({
    success: true,
    ...draft,
  });
});

// ===============================
// HELPER: BUILD PIPELINE STATUS
// ===============================
export const buildPipelineStatus = async (orgId) => {
  const leads = await Lead.find({ organization: orgId });
  const stages = ["New", "Qualified", "Proposal", "Won", "Lost"];
  const byStage = Object.fromEntries(
    stages.map((s) => [s, { count: 0, value: 0 }])
  );

  let totalValue = 0;
  let wonValue = 0;

  for (const l of leads) {
    const stage = stages.includes(l.status) ? l.status : "New";
    byStage[stage].count += 1;
    byStage[stage].value += l.value || 0;
    totalValue += l.value || 0;
    if (l.status === "Won") wonValue += l.value || 0;
  }

  const won = byStage.Won.count;
  const lost = byStage.Lost.count;
  const closed = won + lost;
  const conversionRate = closed ? Math.round((won / closed) * 100) : 0;

  return {
    totalLeads: leads.length,
    pipelineValue: totalValue,
    revenueWon: wonValue,
    conversionRate,
    byStage,
    stages: stages.map((s) => ({
      stage: s,
      count: byStage[s].count,
      value: byStage[s].value,
    })),
  };
};

export const buildPipelineStats = buildPipelineStatus;

// ===============================
// SALES INSIGHTS
// ===============================
export const salesInsights = asyncHandler(async (req, res) => {
  let stats = req.body?.pipelineStats || req.body?.stats;

  if (!stats) {
    stats = await buildPipelineStatus(req.organization._id);
  }

  const insights = await generateSalesInsights(stats);

  res.json({
    success: true,
    ...insights,
  });
});

// ===============================
// AI ATTENTION CENTER
// ===============================
export const getAttentionLeads = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // 1. Fetch all open leads (excluding Won and Lost)
  const openLeads = await Lead.find({
    owner: userId,
    organization: req.organization._id,
    status: { $nin: ["Won", "Lost"] },
  });

  if (openLeads.length === 0) {
    return res.json({ success: true, count: 0, leads: [] });
  }

  // 2. Fetch pending tasks for the user to check upcoming follow-ups
  const pendingTasks = await Task.find({
    owner: userId,
    organization: req.organization._id,
    status: { $ne: "Completed" },
  });

  const leadTaskMap = new Set(
    pendingTasks
      .filter((t) => t.relatedLead)
      .map((t) => t.relatedLead.toString())
  );

  const now = new Date();

  // 3. Compute risk scores and explainable reasons for each lead
  const assessedLeads = openLeads.map((lead) => {
    const updatedAt = new Date(lead.updatedAt || lead.createdAt);
    const daysInactive = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));
    const hasFollowUp = leadTaskMap.has(lead._id.toString());

    let computedRisk = lead.aiRiskScore !== null && lead.aiRiskScore !== undefined ? lead.aiRiskScore : 30;
    const reasons = [];
    let recommendedAction = "Schedule follow-up call";

    if (daysInactive > 7) {
      computedRisk += Math.min(40, (daysInactive - 7) * 4);
      reasons.push(`No activity recorded for ${daysInactive} days`);
    }

    if (!hasFollowUp) {
      computedRisk += 20;
      reasons.push("No upcoming follow-up task scheduled");
    }

    if (lead.status === "Qualified" && daysInactive > 14) {
      computedRisk += 15;
      reasons.push("Stuck in Qualified stage for over 2 weeks");
      recommendedAction = "Send product demo invite or ROI overview";
    } else if (lead.status === "Proposal" && daysInactive > 10) {
      computedRisk += 20;
      reasons.push("Proposal pending decision for >10 days");
      recommendedAction = "Send closing email or schedule decision call";
    } else if (daysInactive > 14) {
      recommendedAction = "Send re-engagement outreach email";
    }

    // Clamp score between 0 and 100
    const finalRiskScore = Math.min(100, Math.max(0, computedRisk));

    return {
      _id: lead._id,
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      value: lead.value,
      status: lead.status,
      priority: lead.priority,
      riskScore: finalRiskScore,
      reasons: reasons.length > 0 ? reasons : ["Standard follow-up cadence recommended"],
      recommendedAction,
      daysInactive,
      hasFollowUp,
    };
  });

  // 4. Sort by risk score descending & return top risky leads (score >= 40)
  const attentionLeads = assessedLeads
    .filter((l) => l.riskScore >= 40 || l.daysInactive > 5 || !l.hasFollowUp)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 6);

  res.json({
    success: true,
    count: attentionLeads.length,
    leads: attentionLeads,
  });
});

// ===============================
// COPILOT CHAT
// ===============================
export const copilotChat = asyncHandler(async (req, res) => {
  const { messages } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    throw new ApiError(400, "Messages array is required");
  }

  // Inject robust CRM context so the Copilot is context-aware
  const stats = await buildPipelineStatus(req.organization._id);
  
  // Format top active deals for context
  const activeLeads = await Lead.find({ owner: req.user._id, organization: req.organization._id, status: { $nin: ["Won", "Lost"] } })
    .sort({ value: -1 })
    .limit(5);

  const contextStr = activeLeads.map(l => `- ${l.name} at ${l.company} (${l.status}) | Value: ${l.value} | Risk: ${l.aiRiskScore || 0}/100`).join("\n");

  const systemContext = `
You are RevFlux AI Copilot, a highly intelligent sales assistant built directly into the CRM.
Your goal is to help the operator close more deals, analyze data, and draft communications.
Be concise, analytical, and professional but approachable. Use markdown formatting.

CURRENT CRM CONTEXT:
- Operator Name: ${req.user.name}
- Total Open Pipeline: ₹${stats.pipelineValue}
- Deals Won: ${stats.byStage.Won.count}
- Deal Conversion Rate: ${stats.conversionRate}%

Top Active Deals:
${contextStr || "No active deals found."}

When asked about deals, reference this context. You have access to tools to search leads, add notes, draft emails, and change lead status. Always try to fulfill the user's request by calling the necessary tools. If you use a tool to edit a record, confirm the action back to the user.
  `.trim();

  const { generateChatResponse } = await import("../services/ai.service.js");
  const responseText = await generateChatResponse(messages, systemContext, { organizationId: req.organization._id, userId: req.user._id });

  res.json({
    success: true,
    message: responseText,
  });
});
