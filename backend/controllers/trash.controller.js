import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import { Contact } from "../models/Contact.js";
import { Task } from "../models/Task.js";
import { Note } from "../models/Note.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { logActivity } from "../services/activity.service.js";
import { PERMISSIONS } from "../config/permissions.js";
import { hasEffectivePermission } from "../middleware/rbac.middleware.js";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export const ENTITY_CONFIG = {
  leads: {
    model: Lead,
    name: "Lead",
    actionPrefix: "LEAD",
    readPermission: PERMISSIONS.LEADS_READ,
    updatePermission: PERMISSIONS.LEADS_UPDATE,
    deletePermission: PERMISSIONS.LEADS_DELETE,
    titleField: "name",
    pluralKey: "leads",
  },
  lead: {
    model: Lead,
    name: "Lead",
    actionPrefix: "LEAD",
    readPermission: PERMISSIONS.LEADS_READ,
    updatePermission: PERMISSIONS.LEADS_UPDATE,
    deletePermission: PERMISSIONS.LEADS_DELETE,
    titleField: "name",
    pluralKey: "leads",
  },
  contacts: {
    model: Contact,
    name: "Contact",
    actionPrefix: "CONTACT",
    readPermission: PERMISSIONS.CONTACTS_READ,
    updatePermission: PERMISSIONS.CONTACTS_UPDATE,
    deletePermission: PERMISSIONS.CONTACTS_DELETE,
    titleField: "name",
    pluralKey: "contacts",
  },
  contact: {
    model: Contact,
    name: "Contact",
    actionPrefix: "CONTACT",
    readPermission: PERMISSIONS.CONTACTS_READ,
    updatePermission: PERMISSIONS.CONTACTS_UPDATE,
    deletePermission: PERMISSIONS.CONTACTS_DELETE,
    titleField: "name",
    pluralKey: "contacts",
  },
  tasks: {
    model: Task,
    name: "Task",
    actionPrefix: "TASK",
    readPermission: PERMISSIONS.TASKS_READ,
    updatePermission: PERMISSIONS.TASKS_UPDATE,
    deletePermission: PERMISSIONS.TASKS_DELETE,
    titleField: "title",
    pluralKey: "tasks",
  },
  task: {
    model: Task,
    name: "Task",
    actionPrefix: "TASK",
    readPermission: PERMISSIONS.TASKS_READ,
    updatePermission: PERMISSIONS.TASKS_UPDATE,
    deletePermission: PERMISSIONS.TASKS_DELETE,
    titleField: "title",
    pluralKey: "tasks",
  },
  notes: {
    model: Note,
    name: "Note",
    actionPrefix: "NOTE",
    readPermission: PERMISSIONS.NOTES_READ,
    updatePermission: PERMISSIONS.NOTES_UPDATE,
    deletePermission: PERMISSIONS.NOTES_DELETE,
    titleField: "content",
    pluralKey: "notes",
  },
  note: {
    model: Note,
    name: "Note",
    actionPrefix: "NOTE",
    readPermission: PERMISSIONS.NOTES_READ,
    updatePermission: PERMISSIONS.NOTES_UPDATE,
    deletePermission: PERMISSIONS.NOTES_DELETE,
    titleField: "content",
    pluralKey: "notes",
  },
};

const ALLOWED_TYPES = ["leads", "contacts", "tasks", "notes", "lead", "contact", "task", "note"];

/**
 * Helper to calculate remaining days until permanent expiration
 */
const getDaysRemaining = (deletedAt) => {
  if (!deletedAt) return 0;
  const elapsed = Date.now() - new Date(deletedAt).getTime();
  const remainingMs = RETENTION_MS - elapsed;
  return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
};

// ===============================
// GET TRASH (LIST DELETED ITEMS)
// ===============================
export const getTrash = asyncHandler(async (req, res) => {
  const entityType = req.params.entityType || req.query.entityType;
  const cutoff = new Date(Date.now() - RETENTION_MS);

  if (entityType && !ALLOWED_TYPES.includes(entityType.toLowerCase())) {
    throw new ApiError(400, "Invalid entity type. Allowed: leads, contacts, tasks, notes");
  }

  const baseQuery = {
    organization: req.organization._id,
    isDeleted: true,
    deletedAt: { $gte: cutoff },
  };

  // Reps are strictly sandboxed to records they own
  if (req.membership && req.membership.role === "rep") {
    baseQuery.owner = req.user._id;
  }

  const typesToFetch = entityType
    ? [entityType.toLowerCase()]
    : ["leads", "contacts", "tasks", "notes"];

  const queries = [];

  if (typesToFetch.includes("leads") || typesToFetch.includes("lead")) {
    if (hasEffectivePermission(req.membership, PERMISSIONS.LEADS_READ)) {
      queries.push(
        Lead.find(baseQuery)
          .sort({ deletedAt: -1 })
          .populate("owner", "name email avatar")
          .then((items) =>
            items.map((doc) => ({
              id: doc._id,
              _id: doc._id,
              entityType: "lead",
              title: doc.name || "Untitled Lead",
              subtitle: doc.company || doc.email || "",
              status: doc.status,
              deletedAt: doc.deletedAt,
              daysRemaining: getDaysRemaining(doc.deletedAt),
              owner: doc.owner,
            }))
          )
      );
    }
  }

  if (typesToFetch.includes("contacts") || typesToFetch.includes("contact")) {
    if (hasEffectivePermission(req.membership, PERMISSIONS.CONTACTS_READ)) {
      queries.push(
        Contact.find(baseQuery)
          .sort({ deletedAt: -1 })
          .populate("owner", "name email avatar")
          .then((items) =>
            items.map((doc) => ({
              id: doc._id,
              _id: doc._id,
              entityType: "contact",
              title: doc.name || "Untitled Contact",
              subtitle: doc.title ? `${doc.title} at ${doc.company}` : doc.email || "",
              deletedAt: doc.deletedAt,
              daysRemaining: getDaysRemaining(doc.deletedAt),
              owner: doc.owner,
            }))
          )
      );
    }
  }

  if (typesToFetch.includes("tasks") || typesToFetch.includes("task")) {
    if (hasEffectivePermission(req.membership, PERMISSIONS.TASKS_READ)) {
      queries.push(
        Task.find(baseQuery)
          .sort({ deletedAt: -1 })
          .populate("owner", "name email avatar")
          .then((items) =>
            items.map((doc) => ({
              id: doc._id,
              _id: doc._id,
              entityType: "task",
              title: doc.title || "Untitled Task",
              subtitle: doc.dueDate ? `Due ${new Date(doc.dueDate).toLocaleDateString()}` : "",
              status: doc.status,
              deletedAt: doc.deletedAt,
              daysRemaining: getDaysRemaining(doc.deletedAt),
              owner: doc.owner,
            }))
          )
      );
    }
  }

  if (typesToFetch.includes("notes") || typesToFetch.includes("note")) {
    if (hasEffectivePermission(req.membership, PERMISSIONS.NOTES_READ)) {
      queries.push(
        Note.find(baseQuery)
          .sort({ deletedAt: -1 })
          .populate("owner", "name email avatar")
          .then((items) =>
            items.map((doc) => ({
              id: doc._id,
              _id: doc._id,
              entityType: "note",
              title: doc.content ? doc.content.slice(0, 60) + (doc.content.length > 60 ? "..." : "") : "Untitled Note",
              subtitle: doc.lead ? "Lead Note" : doc.contact ? "Contact Note" : "General Note",
              deletedAt: doc.deletedAt,
              daysRemaining: getDaysRemaining(doc.deletedAt),
              owner: doc.owner,
            }))
          )
      );
    }
  }

  const results = await Promise.all(queries);
  const flatItems = results.flat().sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

  res.json({
    success: true,
    count: flatItems.length,
    items: flatItems,
  });
});

// ===============================
// RESTORE RECORD FROM TRASH
// ===============================
export const restoreTrash = asyncHandler(async (req, res) => {
  const { entityType, id } = req.params;

  if (!entityType || !ALLOWED_TYPES.includes(entityType.toLowerCase())) {
    throw new ApiError(400, "Invalid entity type. Allowed: leads, contacts, tasks, notes");
  }

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid record ID");
  }

  const config = ENTITY_CONFIG[entityType.toLowerCase()];

  // Require update permission for the entity type
  if (!hasEffectivePermission(req.membership, config.updatePermission)) {
    throw new ApiError(
      403,
      `Access Denied: Your account lacks the '${config.updatePermission}' permission to restore records.`
    );
  }

  const query = {
    _id: id,
    organization: req.organization._id,
    isDeleted: true,
  };

  // Rep ownership sandboxing: reps can only restore their own records
  if (req.membership && req.membership.role === "rep") {
    query.owner = req.user._id;
  }

  const doc = await config.model.findOne(query);

  if (!doc) {
    throw new ApiError(404, `${config.name} not found in trash or access denied`);
  }

  // 30-day retention cutoff validation: reject expired records
  const cutoff = new Date(Date.now() - RETENTION_MS);
  if (!doc.deletedAt || doc.deletedAt < cutoff) {
    throw new ApiError(400, `Cannot restore: record exceeds the 30-day recovery retention window`);
  }

  // Quota enforcement: check if restoring a Lead would exceed plan limit
  if (config.name === "Lead") {
    const org = req.organization;
    const isUnlimited = org?.plan === "business" || (org?.leadLimit && org.leadLimit >= 999999);
    const leadLimit = org?.leadLimit ?? 50;

    if (!isUnlimited) {
      const currentLeadCount = await Lead.countDocuments({
        organization: req.organization._id,
        isDeleted: { $ne: true },
      });

      if (currentLeadCount + 1 > leadLimit) {
        throw new ApiError(
          402,
          `Lead limit reached (${currentLeadCount}/${leadLimit} leads). Upgrade your RevFlux plan to restore more leads.`
        );
      }
    }
  }

  // Restore the document
  doc.isDeleted = false;
  doc.deletedAt = null;
  await doc.save();

  // If restoring a Lead, restore associated Notes soft-deleted specifically with this lead
  if (config.name === "Lead") {
    await Note.updateMany(
      {
        organization: req.organization._id,
        lead: doc._id,
        deletedWithLead: doc._id,
        isDeleted: true,
      },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          deletedWithLead: null,
        },
      }
    );
  }

  await logActivity({
    organization: req.organization._id,
    user: req.user._id,
    action: `${config.actionPrefix}_RESTORED`,
    entityType: config.name,
    entityId: doc._id,
    details: { name: doc[config.titleField] || "Record" },
  });

  res.json({
    success: true,
    message: `${config.name} restored successfully`,
    item: doc,
  });
});

// ===============================
// PURGE RECORD PERMANENTLY
// ===============================
export const purgeTrash = asyncHandler(async (req, res) => {
  const { entityType, id } = req.params;

  if (!entityType || !ALLOWED_TYPES.includes(entityType.toLowerCase())) {
    throw new ApiError(400, "Invalid entity type. Allowed: leads, contacts, tasks, notes");
  }

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid record ID");
  }

  // Permanent purge is strictly restricted to workspace owner and admin
  if (!req.membership || !["owner", "admin"].includes(req.membership.role)) {
    throw new ApiError(
      403,
      "Access Denied: Only workspace owners and administrators can permanently purge records from trash."
    );
  }

  const config = ENTITY_CONFIG[entityType.toLowerCase()];

  // Also verify delete permission for the entity type
  if (!hasEffectivePermission(req.membership, config.deletePermission)) {
    throw new ApiError(
      403,
      `Access Denied: Your account lacks the '${config.deletePermission}' permission.`
    );
  }

  const doc = await config.model.findOne({
    _id: id,
    organization: req.organization._id,
    isDeleted: true,
  });

  if (!doc) {
    throw new ApiError(404, `${config.name} not found in trash or access denied`);
  }

  // Cascading cleanup of dependent references upon permanent purge
  if (config.name === "Lead") {
    await Note.deleteMany({ organization: req.organization._id, lead: doc._id });
    await Task.updateMany(
      { organization: req.organization._id, relatedLead: doc._id },
      { $set: { relatedLead: null } }
    );
  } else if (config.name === "Contact") {
    await Note.updateMany(
      { organization: req.organization._id, contact: doc._id },
      { $set: { contact: null } }
    );
    await Task.updateMany(
      { organization: req.organization._id, relatedContact: doc._id },
      { $set: { relatedContact: null } }
    );
  }

  await config.model.deleteOne({ _id: doc._id });

  await logActivity({
    organization: req.organization._id,
    user: req.user._id,
    action: `${config.actionPrefix}_PURGED`,
    entityType: config.name,
    entityId: doc._id,
    details: { name: doc[config.titleField] || "Record" },
  });

  res.json({
    success: true,
    message: `${config.name} permanently purged`,
  });
});
