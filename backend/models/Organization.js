import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
    },
    plan: {
      type: String,
      enum: ["free", "starter", "growth", "business"],
      default: "free",
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "trialing", "canceled"],
      default: "trialing",
    },
    leadLimit: {
      type: Number,
      default: 50,
    },
    aiCallCount: {
      type: Number,
      default: 0,
    },
    lastPaymentId: {
      type: String,
      default: "",
    },
    lastBilledAt: {
      type: Date,
      default: null,
    },
    code: {
      type: String,
      uppercase: true,
      trim: true,
      minlength: [2, "Organization code must be at least 2 characters"],
      maxlength: [10, "Organization code cannot exceed 10 characters"],
      match: [/^[A-Z0-9]+$/, "Organization code must be alphanumeric"],
    },
    nextMemberSeq: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

organizationSchema.index(
  { code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: "string" } } }
);

organizationSchema.pre("validate", async function () {
  if (this.code) {
    this.code = this.code.toUpperCase().trim();
  }
  if (!this.nextMemberSeq) {
    this.nextMemberSeq = 1;
  }
});

export default mongoose.model("Organization", organizationSchema);
