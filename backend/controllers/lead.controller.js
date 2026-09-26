import Lead, { LEAD_STATUSES, LEAD_PRIORITIES } from "../models/Lead.js";
import { Note } from "../models/Note.js";
import { Task } from "../models/Task.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { Resend } from "resend";
import { getIO } from "../utils/socket.js";

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

  const oldStatus = lead.status;
  
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

  if (oldStatus !== "Won" && lead.status === "Won") {
    try {
      getIO().to(req.user._id.toString()).emit("notification", {
        type: "success",
        title: "Deal Closed!",
        message: `${lead.name} just moved to Won! ($${lead.value})`,
      });
    } catch (err) {
      console.error("Socket error", err);
    }
  }

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

// ===============================
// SEND EMAIL TO LEAD (via Resend)
// ===============================

export const sendLeadEmail = asyncHandler(async (req, res) => {
  const { subject, body } = req.body;

  if (!subject || !body) {
    throw new ApiError(400, "Subject and body are required to send an email.");
  }

  if (!process.env.RESEND_API_KEY) {
    throw new ApiError(
      503,
      "Resend API key is not configured. Add RESEND_API_KEY to your backend .env file."
    );
  }

  const lead = await Lead.findOne({ _id: req.params.id, owner: req.user._id });

  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  if (!lead.email) {
    throw new ApiError(400, "This lead does not have an email address.");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    // Resend requires a verified domain to send FROM.
    // For testing/free tiers, you often use onboarding@resend.dev which only allows sending TO your own registered email.
    // We will use Acme <onboarding@resend.dev> as the default for the free tier.
    const { data, error } = await resend.emails.send({
      from: "CRM Dashboard <onboarding@resend.dev>",
      to: [lead.email],
      subject: subject,
      html: body.replace(/\n/g, "<br>"), // Basic conversion of plain text draft to HTML
    });

    if (error) {
      console.error("Resend Error:", error);
      throw new ApiError(500, error.message || "Failed to send email");
    }

    // Optional: Auto-create a Note that the email was sent
    await Note.create({
      owner: req.user._id,
      relatedLead: lead._id,
      content: `Email Sent:\n\nSubject: ${subject}\n\n${body}`,
    });

    res.json({
      success: true,
      message: "Email sent successfully",
      data,
    });
  } catch (err) {
    console.error("Email send error:", err);
    throw new ApiError(500, err.message || "Failed to send email via Resend");
  }
});

// ===============================
// IMPORT BULK LEADS (CSV)
// ===============================

export const importLeads = asyncHandler(async (req, res) => {
  const { leads } = req.body;

  if (!leads || !Array.isArray(leads) || leads.length === 0) {
    throw new ApiError(400, "Please provide an array of leads to import.");
  }

  // Ensure every imported lead belongs to the user
  // and has defaults if missing
  const leadsToInsert = leads.map((lead) => ({
    owner: req.user._id,
    name: lead.name || "Unknown Lead",
    company: lead.company || "",
    email: lead.email || "",
    phone: lead.phone || "",
    status: LEAD_STATUSES.includes(lead.status) ? lead.status : "New",
    priority: LEAD_PRIORITIES.includes(lead.priority) ? lead.priority : "Medium",
    value: Number(lead.value) || 0,
    source: lead.source || "Other",
  }));

  const inserted = await Lead.insertMany(leadsToInsert);

  res.status(201).json({
    success: true,
    count: inserted.length,
    message: `Successfully imported ${inserted.length} leads.`,
  });
});
