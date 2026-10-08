import Lead from "../models/Lead.js";
import { Note } from "../models/Note.js";
import User from "../models/User.js";

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

export const executeTool = async (functionName, args, context) => {
  const { organizationId, userId } = context;

  if (functionName === "searchLeads") {
    const leads = await Lead.find({
      organization: organizationId,
      $or: [
        { name: { $regex: args.query, $options: "i" } },
        { company: { $regex: args.query, $options: "i" } }
      ]
    }).limit(5).select("_id name company status");
    
    if (leads.length === 0) return "No leads found matching the query.";
    return JSON.stringify(leads);
  }

  if (functionName === "updateLeadStatus") {
    const lead = await Lead.findOneAndUpdate(
      { _id: args.leadId, organization: organizationId },
      { status: args.status },
      { new: true }
    );
    if (!lead) return "Lead not found or permission denied.";
    
    await Note.create({
      organization: organizationId,
      owner: userId,
      lead: lead._id,
      content: `Status changed to ${args.status} via Copilot.`
    });
    
    return `Lead '${lead.name}' successfully updated to ${args.status}.`;
  }

  if (functionName === "addLeadNote") {
    const lead = await Lead.findOne({ _id: args.leadId, organization: organizationId });
    if (!lead) return "Lead not found.";
    
    await Note.create({
      organization: organizationId,
      owner: userId,
      lead: lead._id,
      content: args.content
    });
    
    return "Note added successfully.";
  }

  if (functionName === "draftEmail") {
    const lead = await Lead.findOne({ _id: args.leadId, organization: organizationId });
    if (!lead) return "Lead not found.";
    
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
