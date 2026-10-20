import mongoose from "mongoose";

export const LEAD_STATUSES = ["New", "Qualified", "Proposal", "Won", "Lost"];

export const LEAD_PRIORITIES = ["Low", "Medium", "High"];

const leadSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Lead name is required"],
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    company: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: "New",
      index: true,
    },

    priority: {
      type: String,
      enum: LEAD_PRIORITIES,
      default: "Medium",
    },

    source: {
      type: String,
      enum: ["Website", "Referral", "Cold Outreach", "Social", "Event", "Other"],
      default: "Other",
    },

    value: {
      type: Number,
      default: 0,
      min: 0,
    },

    notes: {
      type: String,
      default: "",
    },

    tags: {
      type: [String],
      trim: true,
    },

    aiSummary: {
      type: String,
      default: "",
    },

    aiRiskScore: {
      type: Number,
      default: null,
    },

    lastAutoScoredAt: {
      type: Date,
      default: null,
    },

    attachments: [
      {
        name: String,
        url: String,
        publicId: String, // Cloudinary ID for deletion
        format: String,
        size: Number,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    order: {
      type: Number,
      default: 0,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

leadSchema.index({ organization: 1, isDeleted: 1, deletedAt: -1 });

export const Lead = mongoose.model("Lead", leadSchema);
export default Lead;