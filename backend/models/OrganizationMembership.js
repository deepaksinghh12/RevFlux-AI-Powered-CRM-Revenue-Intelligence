import mongoose from "mongoose";

const organizationMembershipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // required: true previously, now optional to allow email-only invites
      index: true,
    },
    inviteEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    inviteToken: String,
    inviteTokenExpiresAt: Date,
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "manager", "rep", "viewer"],
      default: "rep",
    },
    status: {
      type: String,
      enum: ["active", "invited", "suspended"],
      default: "invited",
    },
  },
  {
    timestamps: true,
  }
);

// A user can only have one membership per organization, but we allow multiple null users for pending invites
organizationMembershipSchema.index(
  { user: 1, organization: 1 }, 
  { unique: true, partialFilterExpression: { user: { $exists: true, $type: "objectId" } } }
);

organizationMembershipSchema.index(
  { inviteEmail: 1, organization: 1 },
  { unique: true, partialFilterExpression: { inviteEmail: { $exists: true, $type: "string" } } }
);

export default mongoose.model("OrganizationMembership", organizationMembershipSchema);
