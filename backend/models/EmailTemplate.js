import mongoose from "mongoose";

const emailTemplateSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Template name is required"],
      trim: true,
    },

    category: {
      type: String,
      enum: ["Cold Outreach", "Follow-up", "Proposal", "Re-engagement", "Closing"],
      default: "Follow-up",
    },

    subject: {
      type: String,
      required: [true, "Subject template is required"],
      trim: true,
    },

    body: {
      type: String,
      required: [true, "Body template is required"],
    },

    aiInstruction: {
      type: String,
      default: "",
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const EmailTemplate = mongoose.model("EmailTemplate", emailTemplateSchema);
export default EmailTemplate;
