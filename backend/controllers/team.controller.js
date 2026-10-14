import User from "../models/User.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import crypto from "crypto";
import { sendEmail } from "../services/email.service.js";
import { EMAIL_CATEGORIES } from "../config/email.config.js";
import logger from "../config/logger.js";

// ===============================
// GET TEAM MEMBERS
// ===============================
export const getTeamMembers = asyncHandler(async (req, res) => {
  const orgId = req.organization._id;

  const memberships = await OrganizationMembership.find({
    organization: orgId,
    status: { $in: ["active", "invited"] },
  }).populate("user", "-password");

  res.json({
    success: true,
    count: memberships.length,
    members: memberships.map((m) => {
      if (m.user) {
        return {
          id: m.user._id,
          membershipId: m._id,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          status: m.status,
          avatar: m.user.avatar || "",
          phone: m.user.phone || "",
          jobTitle: m.user.jobTitle || "",
          department: m.user.department || "",
          joinedAt: m.createdAt,
        };
      } else {
        // Pending invite without a user account yet
        return {
          id: null,
          membershipId: m._id,
          name: "Pending Invite",
          email: m.inviteEmail,
          role: m.role,
          status: m.status,
          avatar: "",
          phone: "",
          jobTitle: "",
          department: "",
          joinedAt: m.createdAt,
        };
      }
    }),
  });
});

// ===============================
// INVITE TEAM MEMBER
// ===============================
export const inviteTeamMember = asyncHandler(async (req, res) => {
  const { name, email, role } = req.body;
  const orgId = req.organization._id;

  if (!email) {
    throw new ApiError(400, "Email is required to invite a team member");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const validRoles = ["admin", "manager", "rep", "viewer"];
  const assignedRole = validRoles.includes(role) ? role : "rep";

  let user = await User.findOne({ email: normalizedEmail });

  if (user) {
    // Check if already a member
    const existing = await OrganizationMembership.findOne({
      user: user._id,
      organization: orgId,
    });

    if (existing) {
      if (existing.status === "suspended") {
        existing.status = "active";
        existing.role = assignedRole;
        await existing.save();
        return res.json({
          success: true,
          message: `Reactivated ${user.name} in this workspace as ${assignedRole.toUpperCase()}.`,
        });
      }
      throw new ApiError(409, `${user.email} is already a member of this workspace.`);
    }
  }

  // Check for existing pending invite
  const pendingInvite = await OrganizationMembership.findOne({
    inviteEmail: normalizedEmail,
    organization: orgId,
    status: "invited",
  });

  if (pendingInvite) {
    throw new ApiError(409, `An invitation is already pending for ${normalizedEmail}.`);
  }

  // Generate Invite Token
  const inviteToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(inviteToken).digest("hex");
  
  // Expiration: 7 days
  const inviteTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Create Membership (either linked to user or email-only)
  const membershipData = {
    organization: orgId,
    role: assignedRole,
    status: "invited",
    inviteToken: hashedToken,
    inviteTokenExpiresAt,
  };

  if (user) {
    membershipData.user = user._id;
  } else {
    membershipData.inviteEmail = normalizedEmail;
  }

  const membership = await OrganizationMembership.create(membershipData);

  // Send invitation email via ONBOARDING identity
  const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/accept-invite/${inviteToken}`;
  const inviteHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
      <h3 style="color: #111827;">You've been invited!</h3>
      <p style="color: #4b5563;">You have been invited to join the <strong>${req.organization.name}</strong> workspace as a <strong>${assignedRole}</strong>.</p>
      <p style="margin: 20px 0;"><a href="${inviteUrl}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Click here to accept the invitation</a></p>
      <p style="color: #6b7280; font-size: 14px;">This link will expire in 7 days.</p>
    </div>
  `;

  const sendResult = await sendEmail({
    category: EMAIL_CATEGORIES.ONBOARDING,
    to: normalizedEmail,
    subject: `You've been invited to join ${req.organization.name} on RevFlux`,
    html: inviteHtml,
  });

  const emailDelivered = Boolean(sendResult.success);
  if (!emailDelivered) {
    logger.warn(`Failed to deliver organization invitation email to ${normalizedEmail}: ${sendResult.error?.message}`);
  }

  res.status(201).json({
    success: true,
    emailDelivered,
    message: emailDelivered
      ? `Invitation sent to ${normalizedEmail}!`
      : `Invitation created, but the invitation email could not be delivered.`,
    member: {
      id: user ? user._id : null,
      name: user ? user.name : "Pending Invite",
      email: normalizedEmail,
      role: assignedRole,
      status: "invited",
    },
  });
});

// ===============================
// UPDATE MEMBER ROLE
// ===============================
export const updateMemberRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  const orgId = req.organization._id;

  const validRoles = ["owner", "admin", "manager", "rep", "viewer"];
  if (!role || !validRoles.includes(role)) {
    throw new ApiError(400, "Invalid role specified");
  }

  // Admin cannot promote anyone to owner. Only an owner can assign owner role.
  if (role === "owner" && req.membership.role !== "owner") {
    throw new ApiError(403, "Access Denied: Only an active workspace owner can transfer or assign the owner role.");
  }

  const membership = await OrganizationMembership.findOne({
    user: userId,
    organization: orgId,
  }).populate("user", "name email");

  if (!membership) {
    throw new ApiError(404, "Team member not found in this workspace");
  }

  // Prevent demoting the last owner
  if (membership.role === "owner" && role !== "owner") {
    const ownerCount = await OrganizationMembership.countDocuments({
      organization: orgId,
      role: "owner",
      status: "active",
    });
    if (ownerCount <= 1) {
      throw new ApiError(400, "Cannot demote the last owner of this workspace");
    }
  }

  membership.role = role;
  await membership.save();

  res.json({
    success: true,
    message: `Updated ${membership.user.name}'s role to ${role.toUpperCase()}`,
  });
});

import { revokeOrgRoomAccess } from "../utils/socket.js";

// ===============================
// REMOVE TEAM MEMBER
// ===============================
export const removeTeamMember = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const orgId = req.organization._id;

  if (userId === req.user._id.toString()) {
    throw new ApiError(400, "You cannot remove yourself from the workspace");
  }

  const membership = await OrganizationMembership.findOne({
    user: userId,
    organization: orgId,
  }).populate("user", "name");

  if (!membership) {
    throw new ApiError(404, "Team member not found in this workspace");
  }

  if (membership.role === "owner") {
    throw new ApiError(400, "Cannot remove the workspace owner. Transfer ownership first.");
  }

  membership.status = "suspended";
  await membership.save();

  // Revoke organization room access from any active socket connected by this user
  revokeOrgRoomAccess(userId, orgId);

  res.json({
    success: true,
    message: `Removed ${membership.user.name} from the workspace`,
  });
});
