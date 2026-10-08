import { Note } from "../models/Note.js";
import "../models/Lead.js";
import "../models/Contact.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { logActivity } from "../services/activity.service.js";

export const getNotes = asyncHandler(async (req, res) => {
  const { lead, contact, search } = req.query;

  const filter = { organization: req.organization._id, isDeleted: { $ne: true } };
  if (req.membership && req.membership.role === 'rep') {
    filter.owner = req.user._id;
  }

  if (lead) filter.lead = lead;
  if (contact) filter.contact = contact;

  if (search) {
    filter.content = new RegExp(search, "i");
  }

  const notes = await Note.find(filter)
    .sort({ pinned: -1, createdAt: -1 })
    .populate("lead", "name company")
    .populate("contact", "name company");

  res.json({
    success: true,
    count: notes.length,
    notes
  });
});

export const createNote = asyncHandler(async (req, res) => {
  const { content, lead, contact, pinned } = req.body;

  if (!content) {
    throw new ApiError(400, "Note content is required");
  }

  const note = await Note.create({
    organization: req.organization._id,
    owner: req.user._id, // Assign to current user
    content,
    lead: lead || null,
    contact: contact || null,
    pinned: Boolean(pinned)
  });

  res.status(201).json({
    success: true,
    note
  });

  logActivity({
    organization: req.organization._id,
    user: req.user._id,
    action: "NOTE_CREATED",
    entityType: "Note",
    entityId: note._id,
    details: {}
  });
});

export const updateNote = asyncHandler(async (req, res) => {
  const { content, lead, contact, pinned } = req.body;

  const query = { _id: req.params.id, organization: req.organization._id, isDeleted: { $ne: true } };
  if (req.membership && req.membership.role === 'rep') {
    query.owner = req.user._id;
  }

  const note = await Note.findOne(query);

  if (!note) {
    throw new ApiError(404, "Note not found or access denied");
  }

  if (content !== undefined) note.content = content;
  if (lead !== undefined) note.lead = lead || null;
  if (contact !== undefined) note.contact = contact || null;
  if (pinned !== undefined) note.pinned = Boolean(pinned);

  await note.save();

  res.json({
    success: true,
    note
  });
});

export const deleteNote = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id, organization: req.organization._id, isDeleted: { $ne: true } };
  if (req.membership && req.membership.role === 'rep') {
    query.owner = req.user._id;
  }

  const note = await Note.findOne(query);

  if (!note) {
    throw new ApiError(404, "Note not found or access denied");
  }

  note.isDeleted = true;
  note.deletedAt = new Date();
  await note.save();

  res.json({
    success: true,
    message: "Note deleted successfully"
  });

  logActivity({
    organization: req.organization._id,
    user: req.user._id,
    action: "NOTE_DELETED",
    entityType: "Note",
    entityId: note._id,
    details: {}
  });
});
