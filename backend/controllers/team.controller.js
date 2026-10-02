import User from "../models/User.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

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
    members: memberships.map((m) => ({
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
    })),
  });
});

// ===============================
// INVITE TEAM MEMBER
// ===============================
export const inviteTeamMember = asyncHandler(async (req, res) => {
  const { name, email, role, jobTitle, department } = req.body;
  const orgId = req.organization._id;

  if (!name || !email) {
    throw new ApiError(400, "Name and email are required to invite a team member");
  }

  const validRoles = ["admin", "manager", "rep", "viewer"];
  const assignedRole = validRoles.includes(role) ? role : "rep";

  // Check if user already exists
  let user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Create a new user with a temporary password
    const tempPassword = `RevFlux#${Math.floor(100000 + Math.random() * 900000)}`;
    user = await User.create({
      name,
      email: email.toLowerCase(),
      password: tempPassword,
      jobTitle: jobTitle || "Sales Representative",
      department: department || "Sales",
    });
  }

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

  await OrganizationMembership.create({
    user: user._id,
    organization: orgId,
    role: assignedRole,
    status: "invited",
  });

  res.status(201).json({
    success: true,
    message: `Invited ${user.name} (${assignedRole.toUpperCase()}) to the workspace!`,
    member: {
      id: user._id,
      name: user.name,
      email: user.email,
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

  res.json({
    success: true,
    message: `Removed ${membership.user.name} from the workspace`,
  });
});
