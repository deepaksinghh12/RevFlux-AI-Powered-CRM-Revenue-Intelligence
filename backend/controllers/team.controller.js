import User from "../models/User.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import crypto from "crypto";
import { sendEmail } from "../services/email.service.js";
import { EMAIL_CATEGORIES } from "../config/email.config.js";
import logger from "../config/logger.js";
import { PERMISSIONS } from "../config/permissions.js";
import { computeEffectivePermissions, hasEffectivePermission } from "../middleware/rbac.middleware.js";
import { revokeOrgRoomAccess, notifyUserPermissionsChanged } from "../utils/socket.js";
import { logActivity } from "../services/activity.service.js";

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
          customPermissions: m.customPermissions || [],
          effectivePermissions: computeEffectivePermissions(m),
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
          customPermissions: m.customPermissions || [],
          effectivePermissions: computeEffectivePermissions(m),
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

  const oldRole = membership.role;
  membership.role = role;
  await membership.save();

  // Log activity
  logActivity({
    organization: orgId,
    user: req.user._id,
    action: "MEMBER_ROLE_CHANGED",
    entityType: "OrganizationMembership",
    entityId: membership._id,
    details: {
      targetUserId: userId,
      targetEmail: membership.user?.email,
      targetName: membership.user?.name,
      oldRole,
      newRole: role,
    },
  });

  // Notify target user's active sockets in real-time
  notifyUserPermissionsChanged(userId, orgId, { role });

  res.json({
    success: true,
    message: `Updated ${membership.user.name}'s role to ${role.toUpperCase()}`,
  });
});

// ===============================
// TOGGLE MEMBER STATUS (SUSPEND / REACTIVATE)
// ===============================
export const toggleMemberStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;
  const orgId = req.organization._id;

  if (!["active", "suspended"].includes(status)) {
    throw new ApiError(400, "Status must be 'active' or 'suspended'");
  }

  if (userId === req.user._id.toString()) {
    throw new ApiError(400, "You cannot suspend your own membership");
  }

  const membership = await OrganizationMembership.findOne({
    user: userId,
    organization: orgId,
  }).populate("user", "name email");

  if (!membership) {
    throw new ApiError(404, "Team member not found in this workspace");
  }

  if (membership.role === "owner") {
    throw new ApiError(400, "Cannot suspend the workspace owner");
  }

  const oldStatus = membership.status;
  membership.status = status;
  await membership.save();

  if (status === "suspended") {
    revokeOrgRoomAccess(userId, orgId);
  } else {
    notifyUserPermissionsChanged(userId, orgId, { status });
  }

  logActivity({
    organization: orgId,
    user: req.user._id,
    action: "MEMBER_STATUS_CHANGED",
    entityType: "OrganizationMembership",
    entityId: membership._id,
    details: {
      targetUserId: userId,
      targetEmail: membership.user?.email,
      targetName: membership.user?.name,
      oldStatus,
      newStatus: status,
    },
  });

  res.json({
    success: true,
    message: `${status === "active" ? "Reactivated" : "Suspended"} ${membership.user?.name || membership.user?.email}`,
    status: membership.status,
  });
});

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
  }).populate("user", "name email");

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

  logActivity({
    organization: orgId,
    user: req.user._id,
    action: "MEMBER_REMOVED",
    entityType: "OrganizationMembership",
    entityId: membership._id,
    details: {
      targetUserId: userId,
      targetEmail: membership.user?.email,
      targetName: membership.user?.name,
      role: membership.role,
    },
  });

  res.json({
    success: true,
    message: `Removed ${membership.user.name} from the workspace`,
  });
});

// ===============================
// UPDATE MEMBER CUSTOM PERMISSION OVERRIDES
// ===============================
export const updateMemberPermissions = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { customPermissions } = req.body;
  const orgId = req.organization._id;

  if (!Array.isArray(customPermissions)) {
    throw new ApiError(400, "customPermissions must be an array of { permission, granted } objects");
  }

  // Validate format and ensure all permissions exist in PERMISSIONS
  const validPermissionValues = Object.values(PERMISSIONS);
  const callerEffective = computeEffectivePermissions(req.membership);
  const isCallerOwner = req.membership.role === "owner" || (req.user && req.user.isSuperAdmin);

  for (const item of customPermissions) {
    if (!item || typeof item.permission !== "string" || typeof item.granted !== "boolean") {
      throw new ApiError(400, "Each item in customPermissions must have a valid string 'permission' and boolean 'granted'");
    }

    if (!validPermissionValues.includes(item.permission)) {
      throw new ApiError(400, `Unknown permission: '${item.permission}'. Unknown permissions cannot be granted.`);
    }

    // Delegation boundary: Caller cannot grant a permission they themselves do not possess
    if (item.granted === true && !isCallerOwner && !callerEffective.includes(item.permission)) {
      throw new ApiError(403, `Delegation Denied: You cannot grant '${item.permission}' because you do not possess it.`);
    }
  }

  const membership = await OrganizationMembership.findOne({
    user: userId,
    organization: orgId,
  }).populate("user", "name email");

  if (!membership) {
    throw new ApiError(404, "Team member not found in this workspace");
  }

  // Workspace owner's authority cannot be diminished or tampered with by non-owners
  if (membership.role === "owner" && !isCallerOwner) {
    throw new ApiError(403, "Cannot modify permissions of workspace owner");
  }

  membership.customPermissions = customPermissions.map((c) => ({
    permission: c.permission.trim(),
    granted: c.granted,
  }));

  await membership.save();

  logActivity({
    organization: orgId,
    user: req.user._id,
    action: "MEMBER_PERMISSIONS_CHANGED",
    entityType: "OrganizationMembership",
    entityId: membership._id,
    details: {
      targetUserId: userId,
      targetEmail: membership.user?.email,
      targetName: membership.user?.name,
      customPermissionsCount: membership.customPermissions.length,
    },
  });

  // Notify target user real-time
  notifyUserPermissionsChanged(userId, orgId, {
    customPermissions: membership.customPermissions,
    effectivePermissions: computeEffectivePermissions(membership),
  });

  res.json({
    success: true,
    message: `Updated custom permissions for ${membership.user?.name || membership.user?.email}`,
    customPermissions: membership.customPermissions,
    effectivePermissions: computeEffectivePermissions(membership),
  });
});
