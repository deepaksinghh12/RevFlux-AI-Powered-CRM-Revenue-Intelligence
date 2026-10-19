import { Task } from "../models/Task.js";
import "../models/Lead.js";
import "../models/Contact.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { logActivity } from "../services/activity.service.js";

export const getTasks = asyncHandler(async (req, res) => {
  const filter = { organization: req.organization._id, isDeleted: { $ne: true } };
  if (req.membership && req.membership.role === 'rep') {
    filter.owner = req.user._id;
  }

  const tasks = await Task.find(filter)
    .sort({ status: 1, dueDate: 1, createdAt: -1 })
    .populate("relatedLead", "name company")
    .populate("relatedContact", "name company")
    .populate("owner", "name avatar");

  res.json({
    success: true,
    count: tasks.length,
    tasks
  });
});

import OrganizationMembership from "../models/OrganizationMembership.js";
import Lead from "../models/Lead.js";
import { Contact } from "../models/Contact.js";
import { PERMISSIONS } from "../config/permissions.js";
import { hasEffectivePermission } from "../middleware/rbac.middleware.js";

export const createTask = asyncHandler(async (req, res) => {
  const targetOwnerId = req.body.assignedTo || req.body.owner;
  let finalOwnerId = req.user._id;

  if (targetOwnerId && targetOwnerId.toString() !== req.user._id.toString()) {
    // Check if user has permission to assign
    const hasAssignPerm = hasEffectivePermission(req.membership, PERMISSIONS.LEADS_ASSIGN);

    if (!hasAssignPerm) {
      throw new ApiError(403, "Access Denied: You do not have permission to assign records to other users");
    }

    // Verify target user is active in the same organization
    const targetMembership = await OrganizationMembership.findOne({
      user: targetOwnerId,
      organization: req.organization._id,
      status: "active",
    });

    if (!targetMembership) {
      throw new ApiError(400, "Assigned user is not an active member of this organization");
    }

    finalOwnerId = targetOwnerId;
  }

  // Validate parent lead if provided
  if (req.body.relatedLead) {
    const leadQuery = { _id: req.body.relatedLead, organization: req.organization._id, isDeleted: { $ne: true } };
    if (req.membership && req.membership.role === 'rep') {
      leadQuery.owner = req.user._id;
    }
    const parentLead = await Lead.findOne(leadQuery);
    if (!parentLead) {
      throw new ApiError(404, "Referenced lead not found or access denied");
    }
  }

  // Validate parent contact if provided
  if (req.body.relatedContact) {
    const contactQuery = { _id: req.body.relatedContact, organization: req.organization._id, isDeleted: { $ne: true } };
    if (req.membership && req.membership.role === 'rep') {
      contactQuery.owner = req.user._id;
    }
    const parentContact = await Contact.findOne(contactQuery);
    if (!parentContact) {
      throw new ApiError(404, "Referenced contact not found or access denied");
    }
  }

  const task = await Task.create({
    ...req.body,
    organization: req.organization._id,
    owner: finalOwnerId,
  });

  res.status(201).json({
    success: true,
    task
  });

  logActivity({
    organization: req.organization._id,
    user: req.user._id,
    action: "TASK_CREATED",
    entityType: "Task",
    entityId: task._id,
    details: { title: task.title }
  });
});

export const updateTask = asyncHandler(async (req, res) => {
  const { owner, assignedTo, ...updates } = req.body;
  const newOwner = assignedTo || owner;

  if (updates.status === "Completed" && !updates.completedAt) {
    updates.completedAt = new Date();
  }

  if (updates.status && updates.status !== "Completed") {
    updates.completedAt = null;
  }

  const query = { _id: req.params.id, organization: req.organization._id, isDeleted: { $ne: true } };
  if (req.membership && req.membership.role === 'rep') {
    query.owner = req.user._id;
  }

  const task = await Task.findOne(query);

  if (!task) {
    throw new ApiError(404, "Task not found or access denied");
  }

  // Handle owner reassignment if requested
  if (newOwner && newOwner.toString() !== task.owner.toString()) {
    const hasAssignPerm = hasEffectivePermission(req.membership, PERMISSIONS.LEADS_ASSIGN);

    if (!hasAssignPerm) {
      throw new ApiError(403, "Access Denied: You do not have permission to assign records to other users");
    }

    const targetMembership = await OrganizationMembership.findOne({
      user: newOwner,
      organization: req.organization._id,
      status: "active",
    });

    if (!targetMembership) {
      throw new ApiError(400, "Assigned user is not an active member of this organization");
    }

    task.owner = newOwner;
  }

  // Validate parent lead if updated
  if (updates.relatedLead) {
    const leadQuery = { _id: updates.relatedLead, organization: req.organization._id, isDeleted: { $ne: true } };
    if (req.membership && req.membership.role === 'rep') {
      leadQuery.owner = req.user._id;
    }
    const parentLead = await Lead.findOne(leadQuery);
    if (!parentLead) {
      throw new ApiError(404, "Referenced lead not found or access denied");
    }
  }

  // Validate parent contact if updated
  if (updates.relatedContact) {
    const contactQuery = { _id: updates.relatedContact, organization: req.organization._id, isDeleted: { $ne: true } };
    if (req.membership && req.membership.role === 'rep') {
      contactQuery.owner = req.user._id;
    }
    const parentContact = await Contact.findOne(contactQuery);
    if (!parentContact) {
      throw new ApiError(404, "Referenced contact not found or access denied");
    }
  }

  Object.assign(task, updates);
  await task.save();

  res.json({
    success: true,
    task
  });

  if (updates.status) {
    logActivity({
      organization: req.organization._id,
      user: req.user._id,
      action: updates.status === "Completed" ? "TASK_COMPLETED" : "TASK_UPDATED",
      entityType: "Task",
      entityId: task._id,
      details: { title: task.title, status: task.status }
    });
  }
});

export const deleteTask = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id, organization: req.organization._id, isDeleted: { $ne: true } };
  if (req.membership && req.membership.role === 'rep') {
    query.owner = req.user._id;
  }

  const task = await Task.findOne(query);

  if (!task) {
    throw new ApiError(404, "Task not found or access denied");
  }
  
  task.isDeleted = true;
  task.deletedAt = new Date();
  await task.save();

  res.json({
    success: true,
    message: "Task deleted successfully"
  });

  logActivity({
    organization: req.organization._id,
    user: req.user._id,
    action: "TASK_DELETED",
    entityType: "Task",
    entityId: task._id,
    details: { title: task.title }
  });
});
