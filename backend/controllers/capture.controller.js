import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import User from "../models/User.js";
import Lead from "../models/Lead.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import CaptureForm from "../models/CaptureForm.js";
import { getIO } from "../utils/socket.js";

// ===============================
// PUBLIC LEAD CAPTURE
// ===============================
export const captureLead = asyncHandler(async (req, res) => {
  const { ownerId: identifier } = req.params;
  const { name, email, phone, company, notes } = req.body;

  if (!identifier || identifier === "undefined" || !mongoose.Types.ObjectId.isValid(identifier)) {
    return res.status(400).json({ success: false, message: "Invalid or incomplete form link." });
  }

  if (!name || !email) {
    return res.status(400).json({ success: false, message: "Name and email are required." });
  }

  let organizationId = null;
  let ownerIdToAssign = null;

  // 1. Try to resolve as a CaptureForm
  const form = await CaptureForm.findById(identifier);
  if (form) {
    if (!form.isActive) {
      return res.status(400).json({ success: false, message: "This form is no longer active." });
    }
    organizationId = form.organization;
    // For explicitly formed captures, we can leave ownerId null or assign to an admin.
    // We'll leave it null initially and let an admin assign it, or assign to the first owner.
    const orgOwner = await OrganizationMembership.findOne({ organization: organizationId, role: "owner", status: "active" });
    if (orgOwner) ownerIdToAssign = orgOwner.user;
  } else {
    // 2. Fallback: Try to resolve as a legacy User ID (ownerId)
    const owner = await User.findById(identifier);
    if (!owner) {
      return res.status(404).json({ success: false, message: "Form link not found or expired." });
    }

    // Safely map to the user's ONLY organization
    const memberships = await OrganizationMembership.find({ user: owner._id, status: "active" });
    if (memberships.length === 0) {
      return res.status(400).json({ success: false, message: "Link owner does not belong to any active organization." });
    }
    if (memberships.length > 1) {
      return res.status(400).json({ success: false, message: "Ambiguous form link. Please use an explicit CaptureForm link." });
    }
    
    organizationId = memberships[0].organization;
    ownerIdToAssign = owner._id;
  }

  if (!organizationId) {
    return res.status(400).json({ success: false, message: "Could not resolve target organization." });
  }

  // Create lead with BOTH organization and owner
  const lead = await Lead.create({
    organization: organizationId,
    owner: ownerIdToAssign,
    name: name.trim(),
    email: email.trim(),
    phone: phone ? phone.trim() : "",
    company: company ? company.trim() : "",
    notes: notes ? notes.trim() : "",
    status: "New",
    priority: "Medium",
    source: "Website",
    value: 0,
  });

  // Emit real-time notification to the owner
  try {
    if (ownerIdToAssign) {
      getIO().to(ownerIdToAssign.toString()).emit("notification", {
        type: "success",
        title: "New Inbound Lead!",
        message: `${lead.name} just submitted your capture form!`,
      });
    }
  } catch (err) {
    console.error("Socket error on capture", err);
  }

  res.status(201).json({
    success: true,
    message: "Thank you! Your information has been submitted.",
  });
});
