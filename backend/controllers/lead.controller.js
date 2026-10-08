import Lead, { LEAD_STATUSES, LEAD_PRIORITIES } from "../models/Lead.js";
import { Note } from "../models/Note.js";
import { Task } from "../models/Task.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Resend } from "resend";
import { getIO } from "../utils/socket.js";
import cloudinary from "../config/cloudinary.js";
import { escapeRegex } from "../utils/sanitize.js";
import { triggerCadenceForLead } from "./outreach.controller.js";
import { logActivity } from "../services/activity.service.js";

// ===============================
// GET ALL LEADS
// ===============================

export const getLeads = asyncHandler(async (req, res) => {
  const { status, priority, source, search, sort } = req.query;

  const query = { organization: req.organization._id, isDeleted: { $ne: true } };
  // If the user is just a rep, only show their assigned leads.
  // Managers, Ops, Owners, and Superadmins see all leads.
  if (req.membership && req.membership.role === 'rep') {
    query.owner = req.user._id;
  }

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
    const s = escapeRegex(search.trim());
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

  const leads = await Lead.find(query).sort(sortOption).populate("owner", "name avatar email");

  res.json({
    success: true,
    count: leads.length,
    leads,
  });
});

// ===============================
// GET SINGLE LEAD ACTIVITY TIMELINE
// ===============================
export const getLeadActivity = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id, organization: req.organization._id, isDeleted: { $ne: true } };
  if (req.membership && req.membership.role === 'rep') {
    query.owner = req.user._id;
  }

  const lead = await Lead.findOne(query);
  
  if (!lead) {
    throw new ApiError(404, "Lead not found or access denied");
  }

  // Fetch associated notes and tasks in parallel
  const [notes, tasks] = await Promise.all([
    Note.find({ organization: req.organization._id, lead: lead._id, isDeleted: { $ne: true } }).sort({ createdAt: -1 }),
    Task.find({ organization: req.organization._id, relatedLead: lead._id, isDeleted: { $ne: true } }).sort({ createdAt: -1 }),
  ]);

  // Combine into unified chronological activity timeline
  const activity = [];

  // Add initial lead creation event
  activity.push({
    id: `creation-${lead._id}`,
    type: "system",
    title: "Lead Created",
    description: `Lead created via ${lead.source || "Direct Input"}`,
    timestamp: lead.createdAt,
  });

  // Map notes (distinguish between general notes and sent emails)
  notes.forEach((note) => {
    const isEmail = note.content.startsWith("Email Sent:");
    activity.push({
      id: note._id.toString(),
      type: isEmail ? "email" : "note",
      title: isEmail ? "Outreach Email Sent" : "Note Added",
      description: note.content,
      pinned: note.pinned,
      timestamp: note.createdAt,
    });
  });

  // Map tasks
  tasks.forEach((task) => {
    activity.push({
      id: task._id.toString(),
      type: "task",
      title: `Task: ${task.title}`,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      timestamp: task.createdAt,
    });
  });

  // Sort timeline newest first
  activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({
    success: true,
    activity,
    notesCount: notes.length,
    tasksCount: tasks.length,
  });
});

// ===============================
// GET SINGLE LEAD
// ===============================
export const getLead = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id, organization: req.organization._id, isDeleted: { $ne: true } };
  if (req.membership && req.membership.role === 'rep') {
    query.owner = req.user._id;
  }

  const lead = await Lead.findOne(query);

  if (!lead) {
    throw new ApiError(404, "Lead not found or access denied");
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
      organization: req.organization._id,
      status: targetStatus,
    });
  }

  const lead = await Lead.create({
    organization: req.organization._id,
    owner: req.body.assignedTo || req.user._id,
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

  // Background log
  logActivity({
    organization: req.organization._id,
    user: req.user._id,
    action: "LEAD_CREATED",
    entityType: "Lead",
    entityId: lead._id,
    details: { name: lead.name, source: lead.source }
  });
});

// ===============================
// UPDATE LEAD
// ===============================
export const updateLead = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id, organization: req.organization._id, isDeleted: { $ne: true } };
  if (req.membership && req.membership.role === 'rep') {
    query.owner = req.user._id;
  }

  const lead = await Lead.findOne(query);

  if (!lead) {
    throw new ApiError(404, "Lead not found or access denied");
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

  if (oldStatus !== lead.status) {
    triggerCadenceForLead({
      userId: req.user._id,
      lead,
      triggerType: "stage_change",
      newStage: lead.status,
    });
  }

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

  if (oldStatus !== lead.status) {
    logActivity({
      organization: req.organization._id,
      user: req.user._id,
      action: "LEAD_STAGE_CHANGED",
      entityType: "Lead",
      entityId: lead._id,
      details: { oldStage: oldStatus, newStage: lead.status }
    });
  }
});

// ===============================
// DELETE LEAD
// ===============================
export const deleteLead = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id, organization: req.organization._id, isDeleted: { $ne: true } };
  // Even if they have delete permission, reps can only delete their own
  if (req.membership && req.membership.role === 'rep') {
    query.owner = req.user._id;
  }

  const lead = await Lead.findOne(query);

  if (!lead) {
    throw new ApiError(404, "Lead not found or access denied");
  }

  // Soft delete instead of hard delete
  lead.isDeleted = true;
  lead.deletedAt = new Date();
  await lead.save();

  // Soft delete associated notes
  await Note.updateMany(
    { lead: lead._id, isDeleted: { $ne: true } }, 
    { $set: { isDeleted: true, deletedAt: new Date() } }
  );
  
  // Clean up associated tasks
  await Task.updateMany(
    { relatedLead: lead._id }, 
    { $set: { relatedLead: null } }
  );

  res.json({
    success: true,
    message: "Lead deleted",
  });

  logActivity({
    organization: req.organization._id,
    user: req.user._id,
    action: "LEAD_DELETED",
    entityType: "Lead",
    entityId: lead._id,
    details: { name: lead.name }
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
            organization: req.organization._id,
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

  const lead = await Lead.findOne({ _id: req.params.id, organization: req.organization._id });

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
      organization: req.organization._id,
      lead: lead._id,
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

  // Fetch existing emails for this owner to prevent duplicate ingestion
  const existingLeads = await Lead.find({ organization: req.organization._id, email: { $ne: "" } }).select("email");
  const existingEmailSet = new Set(existingLeads.map((l) => l.email.toLowerCase()));

  const validToInsert = [];
  let skippedCount = 0;

  for (const item of leads) {
    const name = item.name ? item.name.trim() : "";
    const email = item.email ? item.email.trim().toLowerCase() : "";

    if (!name) {
      skippedCount++;
      continue;
    }

    // Check duplicate email
    if (email && existingEmailSet.has(email)) {
      skippedCount++;
      continue;
    }

    if (email) existingEmailSet.add(email);

    validToInsert.push({
      organization: req.organization._id,
      owner: req.user._id,
      name: name || "Unknown Lead",
      company: item.company ? item.company.trim() : "",
      email: email,
      phone: item.phone ? item.phone.trim() : "",
      status: LEAD_STATUSES.includes(item.status) ? item.status : "New",
      priority: LEAD_PRIORITIES.includes(item.priority) ? item.priority : "Medium",
      value: Number(item.value) || 0,
      source: item.source || "Website",
    });
  }

  let inserted = [];
  if (validToInsert.length > 0) {
    inserted = await Lead.insertMany(validToInsert, { ordered: false });
  }

  res.status(201).json({
    success: true,
    count: inserted.length,
    importedCount: inserted.length,
    skippedCount,
    message: `Successfully imported ${inserted.length} leads (${skippedCount} duplicates/invalid rows skipped).`,
  });
});

// ===============================
// UPLOAD ATTACHMENT
// ===============================
export const uploadAttachment = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, organization: req.organization._id });

  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  if (!req.file) {
    throw new ApiError(400, "No file uploaded");
  }

  // Upload to Cloudinary using upload_stream
  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `crm_dash/leads/${lead._id}`,
        resource_type: "auto", // handles raw files (pdf, docx) and images
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(req.file.buffer);
  });

  const attachment = {
    name: req.file.originalname,
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    format: uploadResult.format || uploadResult.resource_type,
    size: req.file.size,
  };

  lead.attachments.push(attachment);
  await lead.save();

  res.status(201).json({
    success: true,
    attachment,
    message: "File attached successfully",
  });
});

// ===============================
// DELETE ATTACHMENT
// ===============================
export const deleteAttachment = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, organization: req.organization._id });

  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  const attachmentId = req.params.attachmentId;
  const attachment = lead.attachments.id(attachmentId);

  if (!attachment) {
    throw new ApiError(404, "Attachment not found");
  }

  // Delete from Cloudinary
  if (attachment.publicId) {
    // If it's a raw file (pdf), resource_type must be raw
    const resourceType = ["pdf", "zip", "raw"].includes(attachment.format) ? "raw" : "image";
    await cloudinary.uploader.destroy(attachment.publicId, { resource_type: resourceType }).catch(err => console.error("Cloudinary delete error:", err));
  }

  lead.attachments.pull(attachmentId);
  await lead.save();

  res.json({
    success: true,
    message: "Attachment removed",
  });
});
