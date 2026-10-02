import mongoose from "mongoose";

const organizationMembershipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
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

// A user can only have one membership per organization
organizationMembershipSchema.index({ user: 1, organization: 1 }, { unique: true });

export default mongoose.model("OrganizationMembership", organizationMembershipSchema);
