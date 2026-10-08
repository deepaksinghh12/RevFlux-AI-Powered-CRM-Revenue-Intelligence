import { Contact } from "../models/Contact.js";
import { Note } from "../models/Note.js";
import { Task } from "../models/Task.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { logActivity } from "../services/activity.service.js";

// ===============================
// GET CONTACTS
// ===============================
export const getContacts = asyncHandler(async (req, res) => {
  const { search, tag } = req.query;
  const filter = { organization: req.organization._id, isDeleted: { $ne: true } };

  if (req.membership && req.membership.role === 'rep') {
    filter.owner = req.user._id;
  }

  if (tag) filter.tags = tag;

  if (search) {
    const rx = new RegExp(search, "i");
    filter.$or = [
      { name: rx },
      { email: rx },
      { company: rx }
    ];
  }

  const contacts = await Contact.find(filter).sort({
    favorite: -1,
    name: 1
  });

  res.json({
    success: true,
    count: contacts.length,
    contacts
  });
});

// ===============================
// GET SINGLE CONTACT
// ===============================
export const getContact = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id, organization: req.organization._id, isDeleted: { $ne: true } };
  if (req.membership && req.membership.role === 'rep') {
    query.owner = req.user._id;
  }

  const contact = await Contact.findOne(query);

  if (!contact) {
    throw new ApiError(404, "Contact not found or access denied");
  }

  res.json({
    success: true,
    contact
  });
});

// ===============================
// CREATE CONTACT
// ===============================
export const createContact = asyncHandler(async (req, res) => {
  const { name, email, phone, company, title, tags, notes, favorite } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, "Contact name is required");
  }

  const contact = await Contact.create({
    organization: req.organization._id,
    owner: req.body.assignedTo || req.user._id,
    name: name.trim(),
    email: email ? email.trim().toLowerCase() : "",
    phone: phone ? phone.trim() : "",
    company: company ? company.trim() : "",
    title: title ? title.trim() : "",
    tags: Array.isArray(tags) ? tags : [],
    notes: notes || "",
    favorite: Boolean(favorite),
  });

  res.status(201).json({
    success: true,
    contact,
  });

  logActivity({
    organization: req.organization._id,
    user: req.user._id,
    action: "CONTACT_CREATED",
    entityType: "Contact",
    entityId: contact._id,
    details: { name: contact.name, email: contact.email }
  });
});

// ===============================
// UPDATE CONTACT
// ===============================
export const updateContact = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id, organization: req.organization._id, isDeleted: { $ne: true } };
  if (req.membership && req.membership.role === 'rep') {
    query.owner = req.user._id;
  }

  const contact = await Contact.findOne(query);

  if (!contact) {
    throw new ApiError(404, "Contact not found or access denied");
  }

  const allowedFields = [
    "name",
    "email",
    "phone",
    "company",
    "title",
    "tags",
    "notes",
    "favorite",
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (field === "name") {
        contact.name = req.body.name.trim();
      } else if (field === "email") {
        contact.email = req.body.email ? req.body.email.trim().toLowerCase() : "";
      } else if (field === "tags") {
        contact.tags = Array.isArray(req.body.tags) ? req.body.tags : [];
      } else {
        contact[field] = req.body[field];
      }
    }
  });

  await contact.save();

  res.json({
    success: true,
    contact,
  });
});

// ===============================
// DELETE CONTACT
// ===============================
export const deleteContact = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id, organization: req.organization._id, isDeleted: { $ne: true } };
  if (req.membership && req.membership.role === 'rep') {
    query.owner = req.user._id;
  }

  const contact = await Contact.findOne(query);

  if (!contact) {
    throw new ApiError(404, "Contact not found or access denied");
  }

  // Soft delete instead of hard delete
  contact.isDeleted = true;
  contact.deletedAt = new Date();
  await contact.save();

  // Clean up references to this contact in Notes and Tasks
  await Promise.all([
    Note.updateMany({ contact: contact._id }, { $set: { contact: null } }),
    Task.updateMany({ relatedContact: contact._id }, { $set: { relatedContact: null } }),
  ]);

  res.json({
    success: true,
    message: "Contact deleted",
  });

  logActivity({
    organization: req.organization._id,
    user: req.user._id,
    action: "CONTACT_DELETED",
    entityType: "Contact",
    entityId: contact._id,
    details: { name: contact.name }
  });
});
