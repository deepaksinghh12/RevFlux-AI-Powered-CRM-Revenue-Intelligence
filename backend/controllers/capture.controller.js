import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import User from "../models/User.js";
import Lead from "../models/Lead.js";
import { getIO } from "../utils/socket.js";

// ===============================
// PUBLIC LEAD CAPTURE
// ===============================
export const captureLead = asyncHandler(async (req, res) => {
  const { ownerId } = req.params;
  const { name, email, phone, company, notes } = req.body;

  // Validate ownerId format
  if (!ownerId || ownerId === "undefined" || !mongoose.Types.ObjectId.isValid(ownerId)) {
    return res.status(400).json({ success: false, message: "Invalid or incomplete form link." });
  }

  // Validate owner exists
  const owner = await User.findById(ownerId);
  if (!owner) {
    return res.status(404).json({ success: false, message: "Form link owner not found." });
  }

  if (!name || !email) {
    return res.status(400).json({ success: false, message: "Name and email are required." });
  }

  // Create lead
  const lead = await Lead.create({
    owner: ownerId,
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
    getIO().to(ownerId.toString()).emit("notification", {
      type: "success",
      title: "New Inbound Lead!",
      message: `${lead.name} just submitted your capture form!`,
    });
  } catch (err) {
    console.error("Socket error on capture", err);
  }

  res.status(201).json({
    success: true,
    message: "Thank you! Your information has been submitted.",
  });
});
