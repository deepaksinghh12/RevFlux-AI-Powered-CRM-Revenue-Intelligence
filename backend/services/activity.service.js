import { ActivityLog } from "../models/ActivityLog.js";

/**
 * Log a system activity
 * @param {Object} params
 * @param {ObjectId} params.organization - The organization ID
 * @param {ObjectId} params.user - The user ID who performed the action
 * @param {String} params.action - Action enum (e.g. LEAD_CREATED)
 * @param {String} params.entityType - Entity model name (e.g. Lead, Contact)
 * @param {ObjectId} params.entityId - ID of the entity
 * @param {Object} [params.details] - Extra metadata
 */
export const logActivity = async ({
  organization,
  user,
  action,
  entityType,
  entityId,
  details = {}
}) => {
  try {
    await ActivityLog.create({
      organization,
      user,
      action,
      entityType,
      entityId,
      details
    });
  } catch (err) {
    console.error("Failed to write activity log:", err);
    // We don't throw here to avoid failing the main request if logging fails
  }
};
