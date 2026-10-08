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

export const createTask = asyncHandler(async (req, res) => {
  const task = await Task.create({
    ...req.body,
    organization: req.organization._id,
    owner: req.body.assignedTo || req.body.owner || req.user._id,
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
  const { owner, ...updates } = req.body;

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

  const task = await Task.findOneAndUpdate(
    query,
    updates,
    {
      new: true,
      runValidators: true
    }
  );

  if (!task) {
    throw new ApiError(404, "Task not found or access denied");
  }

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
