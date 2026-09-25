import Lead, { LEAD_STATUSES, LEAD_PRIORITIES } from "../models/Lead.js";
import { Note } from "../models/Note.js";
import { Task } from "../models/Task.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

// ===============================
// GET ALL LEADS
// ===============================

export const getLeads = asyncHandler(async (req, res) => {
  const { status, priority, source, search, sort } = req.query;

  const query = { owner: req.user._id };

  if (status && LEAD_STATUSES.includes(status)) {
    query.status = status;
  }

  if (priority && LEAD_PRIORITIES.includes(priority)) {
    query.priority = priority;
  }

  if (source) {
    query.source = source;
  }

  if (search && search.trim()) {
    const s = search.trim();
    query.$or = [
      { name: { $regex: s, $options: "i" } },
      { company: { $regex: s, $options: "i" } },
      { email: { $regex: s, $options: "i" } },
      { phone: { $regex: s, $options: "i" } },
    ];
  }

  // Sorting
  let sortOption = { order: 1, updatedAt: -1 };
  if (sort) {
    if (sort.startsWith("-")) {
      sortOption = { [sort.substring(1)]: -1 };
    } else if (sort.includes(":")) {
      const [field, dir] = sort.split(":");
      sortOption = { [field]: dir === "desc" ? -1 : 1 };
    } else {
      sortOption = { [sort]: 1 };
    }
  }

  const leads = await Lead.find(query).sort(sortOption);

  res.json({
    success: true,
    count: leads.length,
    leads,
  });
});

// ===============================
// GET SINGLE LEAD
// ===============================
export const getLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({
    _id: req.params.id,
    owner: req.user._id,
  });

  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  res.json({
    success: true,
    lead,
  });
});

// ===============================
// CREATE LEAD
// ===============================
export const createLead = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    company,
    status,
    priority,
    source,
    value,
    notes,
    tags,
    aiSummary,
    aiRiskScore,
    order,
  } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, "Lead name is required");
  }

  const targetStatus = status && LEAD_STATUSES.includes(status) ? status : "New";

  // Calculate order if not provided
  let leadOrder = order;
  if (typeof leadOrder !== "number") {
    leadOrder = await Lead.countDocuments({
      owner: req.user._id,
      status: targetStatus,
    });
  }

  const lead = await Lead.create({
    owner: req.user._id,
    name: name.trim(),
    email: email ? email.trim() : undefined,
    phone: phone ? phone.trim() : "",
    company: company ? company.trim() : "",
    status: targetStatus,
    priority: priority && LEAD_PRIORITIES.includes(priority) ? priority : "Medium",
    source: source || "Other",
    value: typeof value === "number" ? value : Number(value) || 0,
    notes: notes || "",
    tags: Array.isArray(tags) ? tags : [],
    aiSummary: aiSummary || "",
    aiRiskScore: typeof aiRiskScore === "number" ? aiRiskScore : null,
    order: leadOrder,
  });

  res.status(201).json({
    success: true,
    lead,
  });
});

// ===============================
// UPDATE LEAD
// ===============================
export const updateLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({
    _id: req.params.id,
    owner: req.user._id,
  });

  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  const allowedFields = [
    "name",
    "email",
    "phone",
    "company",
    "status",
    "priority",
    "source",
    "value",
    "notes",
    "tags",
    "aiSummary",
    "aiRiskScore",
    "order",
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (field === "name") {
        lead.name = req.body.name.trim();
      } else if (field === "status") {
        if (LEAD_STATUSES.includes(req.body.status)) {
          lead.status = req.body.status;
        }
      } else if (field === "priority") {
        if (LEAD_PRIORITIES.includes(req.body.priority)) {
          lead.priority = req.body.priority;
        }
      } else if (field === "value") {
        lead.value = Number(req.body.value) || 0;
      } else {
        lead[field] = req.body[field];
      }
    }
  });

  await lead.save();

  res.json({
    success: true,
    lead,
  });
});

// ===============================
// DELETE LEAD
// ===============================
export const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({
    _id: req.params.id,
    owner: req.user._id,
  });

  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  await lead.deleteOne();

  // Clean up associated notes & unset related lead on tasks
  await Promise.all([
    Note.deleteMany({ lead: lead._id }),
    Task.updateMany({ relatedLead: lead._id }, { $set: { relatedLead: null } }),
  ]);

  res.json({
    success: true,
    message: "Lead deleted",
  });
});

// ===============================
// REORDER LEADS
// ===============================
export const reorderLeads = asyncHandler(async (req, res) => {
  const updates = Array.isArray(req.body) ? req.body : req.body?.updates;

  if (!Array.isArray(updates) || updates.length === 0) {
    throw new ApiError(400, "Updates array is required");
  }

  const bulkOps = updates
    .filter((item) => item && (item.id || item._id))
    .map((item) => {
      const updateData = {};
      if (item.status && LEAD_STATUSES.includes(item.status)) {
        updateData.status = item.status;
      }
      if (typeof item.order === "number") {
        updateData.order = item.order;
      }

      return {
        updateOne: {
          filter: {
            _id: item.id || item._id,
            owner: req.user._id,
          },
          update: { $set: updateData },
        },
      };
    });

  if (bulkOps.length > 0) {
    await Lead.bulkWrite(bulkOps);
  }

  res.json({
    success: true,
    message: "Pipeline updated",
  });
});

// Alias for singular / plural compatibility
export const reorderLead = reorderLeads;
