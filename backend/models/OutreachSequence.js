import mongoose from "mongoose";

const outreachSequenceSchema = new mongoose.Schema(
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
      required: [true, "Sequence name is required"],
      trim: true,
    },

    triggerType: {
      type: String,
      enum: ["stage_change", "at_risk", "new_lead"],
      required: true,
    },

    triggerStage: {
      type: String,
      default: "Proposal",
    },

    riskThreshold: {
      type: Number,
      default: 60,
    },

    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailTemplate",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    executionsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const OutreachSequence = mongoose.model("OutreachSequence", outreachSequenceSchema);

const outreachQueueSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      // required: true will be enforced post-migration
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },

    sequence: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OutreachSequence",
    },

    subject: {
      type: String,
      required: true,
    },

    body: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending_review", "sent", "dismissed"],
      default: "pending_review",
    },

    triggerReason: {
      type: String,
      default: "Automated Cadence Trigger",
    },

    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const OutreachQueue = mongoose.model("OutreachQueue", outreachQueueSchema);
export default { OutreachSequence, OutreachQueue };
