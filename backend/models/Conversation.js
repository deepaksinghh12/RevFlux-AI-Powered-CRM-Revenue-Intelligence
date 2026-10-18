import mongoose from "mongoose";

const unreadStateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
    unreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["direct", "group"],
      default: "direct",
      required: true,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      text: {
        type: String,
        default: "",
      },
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      createdAt: {
        type: Date,
      },
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    unreadState: [unreadStateSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes for high-performance organization-scoped queries
conversationSchema.index({ organization: 1, lastActivityAt: -1 });
conversationSchema.index({ organization: 1, participants: 1 });
conversationSchema.index({ organization: 1, type: 1 });

export default mongoose.model("Conversation", conversationSchema);
