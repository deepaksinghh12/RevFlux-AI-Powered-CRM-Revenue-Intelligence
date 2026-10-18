import mongoose from "mongoose";

const readReceiptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const deliveryReceiptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deliveredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: [true, "Message text is required"],
      trim: true,
      minlength: [1, "Message text cannot be empty"],
      maxlength: [4000, "Message text cannot exceed 4000 characters"],
    },
    deliveredTo: [deliveryReceiptSchema],
    readBy: [readReceiptSchema],
    clientMessageId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// High performance index for paginated message retrieval
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ organization: 1, conversation: 1 });
messageSchema.index({ conversation: 1, clientMessageId: 1 }, { sparse: true });

export default mongoose.model("Message", messageSchema);
