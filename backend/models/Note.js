import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
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

    content: {
      type: String,
      required: [true, "Note content is required"],
    },

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      default: null,
    },

    pinned: {
      type: Boolean,
      default: false,
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
    deletedWithLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

noteSchema.index({ organization: 1, isDeleted: 1, deletedAt: -1 });

export const Note = mongoose.model("Note", noteSchema);