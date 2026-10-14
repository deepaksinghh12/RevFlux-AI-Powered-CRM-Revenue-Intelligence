import mongoose from "mongoose";
import Lead, { LEAD_STATUSES } from "../models/Lead.js";
import { Note } from "../models/Note.js";
import User from "../models/User.js";
import { ROLE_PERMISSIONS, PERMISSIONS } from "../config/permissions.js";

// Define the tool schemas
export const copilotTools = [
  {
    type: "function",
    function: {
      name: "searchLeads",
      description: "Search for leads in the CRM by name or company to get their ID. Use this before updating a lead if you don't know its ID.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Name or company of the lead to search for" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateLeadStatus",
      description: "Change the status of a lead.",
      parameters: {
        type: "object",
        properties: {
          leadId: { type: "string", description: "The ID of the lead" },
          status: { type: "string", enum: ["New", "Qualified", "Proposal", "Won", "Lost"] },
        },
        required: ["leadId", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "addLeadNote",
      description: "Add a note to a lead's timeline.",
      parameters: {
        type: "object",
        properties: {
          leadId: { type: "string", description: "The ID of the lead" },
          content: { type: "string", description: "The note content" },
        },
        required: ["leadId", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draftEmail",
      description: "Draft an email for a lead. This doesn't send it, but creates a draft note.",
      parameters: {
        type: "object",
        properties: {
          leadId: { type: "string" },
          subject: { type: "string" },
          body: { type: "string" },
        },
        required: ["leadId", "subject", "body"],
      },
    },
  }
];

// Helper to check if role grants required permission
const checkToolPermission = (role, permission) => {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes("*") || perms.includes(permission);
};

export const executeTool = async (functionName, args, context = {}) => {
  const { organizationId, userId, role } = context;

  if (!organizationId || !userId || !role) {
    return "Error: Authentication or organization context missing.";
  }

  if (functionName === "searchLeads") {
    // 1. Permission check: leads.read
    if (!checkToolPermission(role, PERMISSIONS.LEADS_READ)) {
      return "Permission denied: Your role does not have permission to read leads.";
    }

    if (!args || typeof args.query !== "string" || !args.query.trim()) {
      return "Invalid argument: query is required.";
    }

    const queryFilter = {
      organization: organizationId,
      isDeleted: { $ne: true },
      $or: [
        { name: { $regex: args.query.trim(), $options: "i" } },
        { company: { $regex: args.query.trim(), $options: "i" } }
      ]
    };

    // If rep, restrict search to assigned leads
    if (role === "rep") {
      queryFilter.owner = userId;
    }

    const leads = await Lead.find(queryFilter).limit(5).select("_id name company status");
    
    if (leads.length === 0) return "No leads found matching the query.";
    return JSON.stringify(leads);
  }

  if (functionName === "updateLeadStatus") {
    // 1. Permission check: leads.update
    if (!checkToolPermission(role, PERMISSIONS.LEADS_UPDATE)) {
      return "Permission denied: Your role does not have permission to update leads.";
    }

    if (!args || !args.leadId || !mongoose.Types.ObjectId.isValid(args.leadId)) {
      return "Invalid argument: A valid leadId is required.";
    }

    if (!args.status || !LEAD_STATUSES.includes(args.status)) {
      return `Invalid argument: status must be one of: ${LEAD_STATUSES.join(", ")}.`;
    }

    const leadFilter = {
      _id: args.leadId,
      organization: organizationId,
      isDeleted: { $ne: true }
    };

    // Reps can only mutate their own leads
    if (role === "rep") {
      leadFilter.owner = userId;
    }

    const lead = await Lead.findOneAndUpdate(
      leadFilter,
      { status: args.status },
      { new: true }
    );

    if (!lead) return "Lead not found or permission denied.";
    
    // Also requires notes.create to log note
    if (checkToolPermission(role, PERMISSIONS.NOTES_CREATE)) {
      await Note.create({
        organization: organizationId,
        owner: userId,
        lead: lead._id,
        content: `Status changed to ${args.status} via Copilot.`
      });
    }
    
    return `Lead '${lead.name}' successfully updated to ${args.status}.`;
  }

  if (functionName === "addLeadNote") {
    // 1. Permission check: notes.create
    if (!checkToolPermission(role, PERMISSIONS.NOTES_CREATE)) {
      return "Permission denied: Your role does not have permission to create notes.";
    }

    if (!args || !args.leadId || !mongoose.Types.ObjectId.isValid(args.leadId)) {
      return "Invalid argument: A valid leadId is required.";
    }

    if (!args.content || typeof args.content !== "string" || !args.content.trim()) {
      return "Invalid argument: Note content is required.";
    }

    const leadFilter = {
      _id: args.leadId,
      organization: organizationId,
      isDeleted: { $ne: true }
    };

    if (role === "rep") {
      leadFilter.owner = userId;
    }

    const lead = await Lead.findOne(leadFilter);
    if (!lead) return "Lead not found or permission denied.";
    
    await Note.create({
      organization: organizationId,
      owner: userId,
      lead: lead._id,
      content: args.content.trim()
    });
    
    return "Note added successfully.";
  }

  if (functionName === "draftEmail") {
    // 1. Permission check: notes.create
    if (!checkToolPermission(role, PERMISSIONS.NOTES_CREATE)) {
      return "Permission denied: Your role does not have permission to create draft notes.";
    }

    if (!args || !args.leadId || !mongoose.Types.ObjectId.isValid(args.leadId)) {
      return "Invalid argument: A valid leadId is required.";
    }

    if (!args.subject || !args.body) {
      return "Invalid argument: Subject and body are required.";
    }

    const leadFilter = {
      _id: args.leadId,
      organization: organizationId,
      isDeleted: { $ne: true }
    };

    if (role === "rep") {
      leadFilter.owner = userId;
    }

    const lead = await Lead.findOne(leadFilter);
    if (!lead) return "Lead not found or permission denied.";
    
    await Note.create({
      organization: organizationId,
      owner: userId,
      lead: lead._id,
      content: `AI Draft Email:\n\n**Subject:** ${args.subject}\n\n${args.body}`
    });
    
    return "Email drafted and saved to lead timeline successfully.";
  }

  return `Function ${functionName} not recognized.`;
};
