import { Contact } from "../models/Contact.js";
import { Note } from "../models/Note.js";
import { Task } from "../models/Task.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

// ===============================
// GET CONTACTS
// ===============================
export const getContacts = asyncHandler(async (req, res) => {
  const { search, tag } = req.query;
  const filter = { owner: req.user._id };

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
  const contact = await Contact.findOne({
    _id: req.params.id,
    owner: req.user._id
  });

  if (!contact) {
    throw new ApiError(404, "Contact not found");
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
    owner: req.user._id,
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
});

// ===============================
// UPDATE CONTACT
// ===============================
export const updateContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({
    _id: req.params.id,
    owner: req.user._id,
  });

  if (!contact) {
    throw new ApiError(404, "Contact not found");
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
  const contact = await Contact.findOne({
    _id: req.params.id,
    owner: req.user._id,
  });

  if (!contact) {
    throw new ApiError(404, "Contact not found");
  }

  await contact.deleteOne();

  // Clean up references to this contact in Notes and Tasks
  await Promise.all([
    Note.updateMany({ contact: contact._id }, { $set: { contact: null } }),
    Task.updateMany({ relatedContact: contact._id }, { $set: { relatedContact: null } }),
  ]);

  res.json({
    success: true,
    message: "Contact deleted",
  });
});
