import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

// ===============================
// GET TEAM MEMBERS
// ===============================
export const getTeamMembers = asyncHandler(async (req, res) => {
  const currentCompany = req.user.company || "";
  
  // Find team members sharing company or default list
  let query = {};
  if (req.user.role === "superadmin") {
    query = {}; // Super admin sees all users
  } else if (currentCompany) {
    query = { company: currentCompany };
  } else {
    query = { _id: req.user._id };
  }

  const members = await User.find(query)
    .select("-password")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: members.length,
    members: members.map((m) => ({
      id: m._id,
      name: m.name,
      email: m.email,
      role: m.role || "owner",
      company: m.company || "",
      avatar: m.avatar || "",
      phone: m.phone || "",
      jobTitle: m.jobTitle || "Sales Leader",
      department: m.department || "Revenue Operations",
      plan: m.plan || "free",
      createdAt: m.createdAt,
    })),
  });
});

// ===============================
// INVITE TEAM MEMBER
// ===============================
export const inviteTeamMember = asyncHandler(async (req, res) => {
  const { name, email, role, jobTitle, department } = req.body;

  if (!name || !email) {
    throw new ApiError(400, "Name and email are required to invite a team member");
  }

  let user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    user.company = req.user.company || user.company;
    if (role && ["owner", "ops_head", "manager", "rep"].includes(role)) {
      user.role = role;
    }
    if (jobTitle) user.jobTitle = jobTitle;
    if (department) user.department = department;
    await user.save();
  } else {
    const tempPassword = `RevFlux#${Math.floor(100000 + Math.random() * 900000)}`;
    user = await User.create({
      name,
      email: email.toLowerCase(),
      password: tempPassword,
      company: req.user.company || "My Company",
      role: role || "rep",
      jobTitle: jobTitle || "Sales Representative",
      department: department || "Sales",
    });
  }

  res.status(201).json({
    success: true,
    message: `Team member ${user.name} (${user.role.toUpperCase()}) added successfully!`,
    member: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      jobTitle: user.jobTitle,
      department: user.department,
    },
  });
});

// ===============================
// UPDATE MEMBER ROLE (Owner/SuperAdmin Only)
// ===============================
export const updateMemberRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role, jobTitle, department } = req.body;

  if (!role || !["superadmin", "owner", "ops_head", "manager", "rep"].includes(role)) {
    throw new ApiError(400, "Invalid RBAC role specified");
  }

  const member = await User.findById(userId);
  if (!member) {
    throw new ApiError(404, "Team member not found");
  }

  // Prevent demoting last owner
  if (member._id.toString() === req.user._id.toString() && role !== "owner" && req.user.role !== "superadmin") {
    throw new ApiError(400, "You cannot demote yourself from Owner mode");
  }

  member.role = role;
  if (jobTitle !== undefined) member.jobTitle = jobTitle;
  if (department !== undefined) member.department = department;

  await member.save();

  res.json({
    success: true,
    message: `Updated ${member.name}'s role to ${role.toUpperCase()}`,
    member: {
      id: member._id,
      name: member.name,
      email: member.email,
      role: member.role,
      jobTitle: member.jobTitle,
      department: member.department,
    },
  });
});

// ===============================
// REMOVE TEAM MEMBER
// ===============================
export const removeTeamMember = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (userId === req.user._id.toString()) {
    throw new ApiError(400, "You cannot remove yourself from the workspace");
  }

  const member = await User.findById(userId);
  if (!member) {
    throw new ApiError(404, "Team member not found");
  }

  member.company = ""; // Unlink from workspace
  await member.save();

  res.json({
    success: true,
    message: `Removed ${member.name} from the workspace`,
  });
});
