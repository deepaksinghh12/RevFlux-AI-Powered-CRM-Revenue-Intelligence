import mongoose from "mongoose";

export const TASK_STATUSES = ["Pending", "In Progress", "Completed"];

export const TASK_PRIORITIES = ["Low", "Medium", "High"];

const taskSchema = new mongoose.Schema(
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

    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    dueDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "Pending",
      index: true,
    },

    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "Medium",
    },

    relatedLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

    relatedContact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
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

taskSchema.index({ organization: 1, isDeleted: 1, deletedAt: -1 });

export const Task = mongoose.model("Task", taskSchema);
export default Task;