import Lead from "../models/Lead.js";
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
    const lead = await Lead.findOne({ _id: leadId, owner: req.user._id });
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
export const buildPipelineStatus = async (userId) => {
  const leads = await Lead.find({ owner: userId });
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
    stats = await buildPipelineStatus(req.user._id);
  }

  const insights = await generateSalesInsights(stats);

  res.json({
    success: true,
    ...insights,
  });
});
