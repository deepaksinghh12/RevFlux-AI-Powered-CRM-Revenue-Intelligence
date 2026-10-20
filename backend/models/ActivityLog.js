import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "LEAD_CREATED",
        "LEAD_UPDATED",
        "LEAD_DELETED",
        "LEAD_RESTORED",
        "LEAD_PURGED",
        "LEAD_STAGE_CHANGED",
        "LEAD_ASSIGNED",
        "LEAD_BULK_ASSIGNED",
        "NOTE_ADDED",
        "NOTE_DELETED",
        "NOTE_RESTORED",
        "NOTE_PURGED",
        "TASK_CREATED",
        "TASK_UPDATED",
        "TASK_COMPLETED",
        "TASK_DELETED",
        "TASK_RESTORED",
        "TASK_PURGED",
        "EMAIL_SENT",
        "CONTACT_CREATED",
        "CONTACT_UPDATED",
        "CONTACT_DELETED",
        "CONTACT_RESTORED",
        "CONTACT_PURGED",
        "USER_INVITED",
        "MEMBER_ROLE_CHANGED",
        "MEMBER_STATUS_CHANGED",
        "MEMBER_REMOVED",
        "MEMBER_PERMISSIONS_CHANGED"
      ],
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: ["Lead", "Contact", "Task", "Note", "OrganizationMembership", "System"],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed, // flexible JSON payload for old/new states
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Auto-expire logs after 90 days to save space
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
export default ActivityLog;
