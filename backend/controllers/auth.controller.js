import User from "../models/User.js";
import { Lead } from "../models/Lead.js";
import { Contact } from "../models/Contact.js";
import { Note } from "../models/Note.js";
import { Task } from "../models/Task.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { generateToken } from "../utils/generateToken.js";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Convert user document into safe object for frontend
// Password is intentionally excluded.
const toClientUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  company: user.company,
  avatar: user.avatar,
  createdAt: user.createdAt,
});

// ===============================
// REGISTER
// ===============================

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, company } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    throw new ApiError(
      400,
      "Name, email and password are required"
    );
  }

  // Check if email already exists
  const exists = await User.findOne({
    email: email.toLowerCase(),
  });

  if (exists) {
    throw new ApiError(
      409,
      "An account with that email already exists"
    );
  }

  // Create user
  // Password will automatically be hashed
  // by the pre-save middleware in User.js
  const user = await User.create({
    name,
    email,
    password,
    company,
  });

  // Generate JWT and return user
  res.status(201).json({
    success: true,
    token: generateToken(user._id),
    user: toClientUser(user),
  });
});

// ===============================
// LOGIN
// ===============================

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Please provide email and password");
  }

  // Find user and explicitly select password field
  const user = await User.findOne({
    email: email.toLowerCase(),
  }).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Match password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Generate token and return user
  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    token,
    user: toClientUser(user),
  });
});

// ===============================
// GET CURRENT USER (Session check)
// ===============================

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    user: toClientUser(req.user),
  });
});

// ===============================
// UPDATE PROFILE
// ===============================

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const { name, company, avatar, password } = req.body;

  if (name) user.name = name;
  if (company !== undefined) user.company = company;
  if (avatar !== undefined) user.avatar = avatar;
  if (password) user.password = password;

  await user.save();

  res.status(200).json({
    success: true,
    user: toClientUser(user),
  });
});

// ===============================
// GOOGLE OAUTH LOGIN / REGISTER
// ===============================

export const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    throw new ApiError(400, "Google credential token is required");
  }

  // Verify Google ID token
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const { name, email, picture } = payload;

  // Check if user exists by email
  let user = await User.findOne({ email });

  if (user) {
    if (!user.avatar && picture) {
      user.avatar = picture;
      await user.save();
    }
  } else {
    const randomPassword = Math.random().toString(36).slice(-10) + Date.now();
    user = await User.create({
      name,
      email,
      password: randomPassword,
      avatar: picture,
      company: "My Company",
    });
  }

  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    token,
    user: toClientUser(user),
  });
});

// ===============================
// 1-CLICK SEED DEMO DATA
// ===============================

export const seedDemoData = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const daysAgo = (n) => new Date(Date.now() - n * 86400000);
  const daysAhead = (n) => new Date(Date.now() + n * 86400000);

  // Clear existing data for user
  await Promise.all([
    Lead.deleteMany({ owner: userId }),
    Contact.deleteMany({ owner: userId }),
    Note.deleteMany({ owner: userId }),
    Task.deleteMany({ owner: userId }),
  ]);

  const sampleLeads = [
    { name: "Dribbble Design", company: "Acme Corp", status: "New", priority: "High", source: "Website", value: 89345, ageDays: 4 },
    { name: "Google Pay Integration", company: "Globex", status: "Qualified", priority: "High", source: "Referral", value: 124000, ageDays: 12 },
    { name: "Amazon Cloud Analytics", company: "Initech", status: "Proposal", priority: "Medium", source: "Cold Outreach", value: 32123, ageDays: 18 },
    { name: "Datadog Observability", company: "Stark Industries", status: "New", priority: "Medium", source: "Website", value: 45000, ageDays: 2 },
    { name: "Stripe Billing", company: "Umbrella Co", status: "Won", priority: "High", source: "Event", value: 76500, ageDays: 45 },
    { name: "Airtable Automation", company: "Wayne Ent.", status: "Qualified", priority: "High", source: "Event", value: 67000, ageDays: 38 },
    { name: "Snowflake Warehouse", company: "Cyberdyne", status: "Proposal", priority: "High", source: "Referral", value: 152000, ageDays: 52 },
    { name: "HubSpot Marketing", company: "Tyrell Corp", status: "Won", priority: "Medium", source: "Event", value: 88000, ageDays: 70 },
  ];

  const createdLeads = [];
  for (const item of sampleLeads) {
    const doc = await Lead.create({
      owner: userId,
      name: item.name,
      company: item.company,
      email: `${item.name.toLowerCase().replace(/[^a-z]/g, "")}@${item.company.toLowerCase().replace(/[^a-z]/g, "")}.com`,
      status: item.status,
      priority: item.priority,
      source: item.source,
      value: item.value,
      notes: "Sample lead seeded during workspace onboarding.",
      tags: ["sample", "demo"],
      aiRiskScore: item.status === "Won" ? 10 : 35,
      createdAt: daysAgo(item.ageDays),
    });
    createdLeads.push(doc);
  }

  if (createdLeads.length > 0) {
    await Task.create({
      owner: userId,
      title: "Schedule product demo",
      relatedLead: createdLeads[0]._id,
      status: "Pending",
      priority: "High",
      dueDate: daysAhead(2),
    });
    await Task.create({
      owner: userId,
      title: "Send pricing proposal",
      relatedLead: createdLeads[1]._id,
      status: "Pending",
      priority: "Medium",
      dueDate: daysAhead(4),
    });
  }

  res.json({
    success: true,
    message: "Sample demo workspace seeded successfully!",
    leadsCount: createdLeads.length,
  });
});