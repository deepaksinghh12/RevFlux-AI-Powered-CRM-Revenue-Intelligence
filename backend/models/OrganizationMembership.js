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
    customPermissions: [
      {
        permission: {
          type: String,
          required: true,
          trim: true,
        },
        granted: {
          type: Boolean,
          default: true,
        },
      },
    ],
    memberSeq: {
      type: Number,
    },
    memberId: {
      type: String,
      trim: true,
      uppercase: true,
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

organizationMembershipSchema.index(
  { organization: 1, memberSeq: 1 },
  { unique: true, partialFilterExpression: { memberSeq: { $type: "number" } } }
);

organizationMembershipSchema.index(
  { organization: 1, memberId: 1 },
  { unique: true, partialFilterExpression: { memberId: { $type: "string" } } }
);

// Atomic allocation hook on validation if memberId is not yet assigned
organizationMembershipSchema.pre("validate", async function () {
  if (!this.memberId && this.organization) {
    const { allocateMemberId } = await import("../utils/memberId.js");
    const allocated = await allocateMemberId(this.organization);
    this.memberSeq = allocated.memberSeq;
    this.memberId = allocated.memberId;
  }
});

export default mongoose.model("OrganizationMembership", organizationMembershipSchema);
