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
        "LEAD_STAGE_CHANGED",
        "LEAD_ASSIGNED",
        "LEAD_BULK_ASSIGNED",
        "NOTE_ADDED",
        "TASK_CREATED",
        "TASK_COMPLETED",
        "EMAIL_SENT",
        "AI_DRAFT_GENERATED",
        "CONTACT_CREATED",
        "USER_INVITED"
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
