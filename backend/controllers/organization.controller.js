import Organization from "../models/Organization.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import { Lead } from "../models/Lead.js";
import { Contact } from "../models/Contact.js";
import { Task } from "../models/Task.js";
import { Note } from "../models/Note.js";
import EmailTemplate from "../models/EmailTemplate.js";
import OutreachSequence from "../models/OutreachSequence.js";
import CaptureForm from "../models/CaptureForm.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

// ===============================
// GET ORGANIZATION SETTINGS
// ===============================
export const getOrganization = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.organization._id);
  if (!org) {
    throw new ApiError(404, "Organization not found");
  }
  res.json({ success: true, organization: org });
});

// ===============================
// UPDATE ORGANIZATION
// ===============================
export const updateOrganization = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const org = await Organization.findById(req.organization._id);

  if (!org) {
    throw new ApiError(404, "Organization not found");
  }

  if (name) org.name = name;
  await org.save();

  res.json({ success: true, organization: org });
});

// ===============================
// DELETE ORGANIZATION (HARD CASCADE)
// ===============================
export const deleteOrganization = asyncHandler(async (req, res) => {
  const orgId = req.organization._id;

  const org = await Organization.findById(orgId);
  if (!org) {
    throw new ApiError(404, "Organization not found");
  }

  // 1. Delete all CRM Data
  await Lead.deleteMany({ organization: orgId });
  await Contact.deleteMany({ organization: orgId });
  await Task.deleteMany({ organization: orgId });
  await Note.deleteMany({ organization: orgId });
  
  // 2. Delete Outreach & Templates
  await EmailTemplate.deleteMany({ organization: orgId });
  await OutreachSequence.deleteMany({ organization: orgId });
  
  // 3. Delete Capture Forms
  await CaptureForm.deleteMany({ organization: orgId });
  
  // 4. Delete Memberships
  await OrganizationMembership.deleteMany({ organization: orgId });
  
  // 5. Delete the Organization itself
  await Organization.findByIdAndDelete(orgId);

  res.json({ success: true, message: "Organization and all associated data successfully deleted" });
});
