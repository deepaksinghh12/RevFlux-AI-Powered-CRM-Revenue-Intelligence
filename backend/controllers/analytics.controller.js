import { asyncHandler } from "../utils/asyncHandler.js";
import { Lead } from "../models/Lead.js";
import { Contact } from "../models/Contact.js";
import { Task } from "../models/Task.js";

const getMonths = (count) => {
  const result = [];
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

    result.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString("default", { month: "short" }),
    });
  }

  return result;
};

export const getOverview = asyncHandler(async (req, res) => {
  const orgId = req.organization._id;
  const range = req.query.range || "monthly";
  const monthCount = range === "annually" ? 12 : 6;

  const leadFilter = { organization: orgId, isDeleted: { $ne: true } };
  const contactFilter = { organization: orgId, isDeleted: { $ne: true } };
  const taskFilter = { organization: orgId, isDeleted: { $ne: true }, status: { $ne: "Completed" } };

  // If rep, restrict data metrics to assigned records
  if (req.membership && req.membership.role === 'rep') {
    leadFilter.owner = req.user._id;
    contactFilter.owner = req.user._id;
    taskFilter.owner = req.user._id;
  }

  const [leads, contactCount, openTasks] = await Promise.all([
    Lead.find(leadFilter),
    Contact.countDocuments(contactFilter),
    Task.countDocuments(taskFilter),
  ]);

  const stages = ["New", "Qualified", "Proposal", "Won", "Lost"];

  const byStage = Object.fromEntries(
    stages.map((s) => [s, { count: 0, value: 0 }])
  );

  let totalValue = 0;
  let wonValue = 0;

  for (const l of leads) {
    const bucket =
      byStage[l.status] ||
      (byStage[l.status] = { count: 0, value: 0 });

    bucket.count += 1;
    bucket.value += l.value || 0;

    totalValue += l.value || 0;

    if (l.status === "Won") {
      wonValue += l.value || 0;
    }
  }

  const won = byStage.Won.count;
  const lost = byStage.Lost.count;
  const closed = won + lost;

  const conversionRate =
    closed > 0 ? Math.round((won / closed) * 100) : 0;

  const months = getMonths(monthCount);

  const trend = months.map(({ key, label }) => ({
    month: label,
    leads: 0,
    won: 0,
  }));

  const indexByKey = Object.fromEntries(
    months.map((m, i) => [m.key, i])
  );

  for (const l of leads) {
    const d = new Date(l.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const idx = indexByKey[key];

    if (idx !== undefined) {
      trend[idx].leads += 1;

      if (l.status === "Won") {
        trend[idx].won += l.value || 0;
      }
    }
  }

  const recentLeads = [...leads]
    .sort(
      (a, b) =>
        new Date(b.updatedAt) - new Date(a.updatedAt)
    )
    .slice(0, 6)
    .map((l) => ({
      id: l._id,
      name: l.name,
      company: l.company,
      status: l.status,
      value: l.value,
      updatedAt: l.updatedAt,
    }));

  // Advanced Analytics
  const sources = {};
  let totalDealCycleDays = 0;
  let wonDealsCount = 0;
  let revenueForecast = 0;

  const PROBABILITIES = {
    New: 0.1,
    Qualified: 0.3,
    Proposal: 0.7,
    Won: 1.0,
    Lost: 0.0,
  };

  for (const l of leads) {
    // 1. Win/Loss by Source
    const source = l.source || "Other";
    if (!sources[source]) sources[source] = { won: 0, lost: 0, total: 0 };
    sources[source].total += 1;
    if (l.status === "Won") sources[source].won += 1;
    if (l.status === "Lost") sources[source].lost += 1;

    // 2. Avg Deal Cycle (Won deals)
    if (l.status === "Won") {
      const created = new Date(l.createdAt).getTime();
      const updated = new Date(l.updatedAt).getTime(); // Assuming updated is when it was won
      const days = (updated - created) / (1000 * 60 * 60 * 24);
      totalDealCycleDays += Math.max(0, days);
      wonDealsCount += 1;
    }

    // 3. Revenue Forecast
    const prob = PROBABILITIES[l.status] || 0;
    revenueForecast += (l.value || 0) * prob;
  }

  const winLossBySource = Object.entries(sources).map(([source, stats]) => ({
    source,
    won: stats.won,
    lost: stats.lost,
    total: stats.total,
    winRate: stats.total > 0 ? Math.round((stats.won / stats.total) * 100) : 0,
  }));

  const avgDealCycle = wonDealsCount > 0 ? Math.round(totalDealCycleDays / wonDealsCount) : 0;

  res.json({
    success: true,

    stats: {
      revenueWon: wonValue,
      pipelineValue: totalValue,
      totalLeads: leads.length,
      totalContacts: contactCount,
      openTasks,
      conversionRate,
      avgDealCycle,
      revenueForecast,
    },

    pipeline: stages.map((s) => ({
      stage: s,
      count: byStage[s].count,
      value: byStage[s].value,
    })),

    trend,
    recentLeads,
    winLossBySource,
  });
});
