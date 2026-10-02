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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Organization", organizationSchema);
