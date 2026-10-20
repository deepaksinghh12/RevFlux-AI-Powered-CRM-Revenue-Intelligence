import User from "../models/User.js";
import Organization from "../models/Organization.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import { Lead } from "../models/Lead.js";
import { Contact } from "../models/Contact.js";
import { Note } from "../models/Note.js";
import { Task } from "../models/Task.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { generateToken } from "../utils/generateToken.js";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendEmail } from "../services/email.service.js";
import { EMAIL_CATEGORIES } from "../config/email.config.js";
import EmailOTP from "../models/EmailOTP.js";
import logger from "../config/logger.js";

import { ROLE_PERMISSIONS } from "../config/permissions.js";
import { computeEffectivePermissions } from "../middleware/rbac.middleware.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const toClientUser = (user, memberships = []) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || "",
  phone: user.phone || "",
  jobTitle: user.jobTitle || "Sales Leader",
  department: user.department || "Revenue Operations",
  signature: user.signature || "",
  isSuperAdmin: user.isSuperAdmin || false,
  createdAt: user.createdAt,
  workspaces: memberships.map(m => ({
    id: m.organization._id,
    name: m.organization.name,
    code: m.organization.code || null,
    memberId: m.memberId || null,
    membershipId: m._id,
    role: m.role,
    status: m.status,
    plan: m.organization.plan,
    leadLimit: m.organization.leadLimit,
    subscriptionStatus: m.organization.subscriptionStatus,
    permissions: computeEffectivePermissions(m),
    customPermissions: m.customPermissions || [],
    lastPaymentId: m.organization.lastPaymentId || "",
    lastBilledAt: m.organization.lastBilledAt || null,
  }))
});

// Helper to fetch and auto-accept memberships
export const getUserMemberships = async (userId) => {
  // Auto-accept any pending invitations upon successful authentication
  await OrganizationMembership.updateMany(
    { user: userId, status: "invited" },
    { $set: { status: "active" } }
  );

  return await OrganizationMembership.find({ user: userId, status: "active" }).populate("organization");
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, company } = req.body;
  if (!name || !email || !password) {
    throw new ApiError(400, "Name, email and password are required");
  }

  let user = await User.findOne({ email: email.toLowerCase() });
  
  if (user) {
    // Check if they are an invited user trying to claim their account
    const isInvited = await OrganizationMembership.findOne({ user: user._id, status: "invited" });
    if (isInvited) {
      user.name = name;
      user.password = password;
      await user.save();
    } else {
      throw new ApiError(409, "An account with that email already exists");
    }
  } else {
    user = await User.create({ name, email, password });
    
    const org = await Organization.create({
      name: company || `${name}'s Workspace`,
    });

    await OrganizationMembership.create({
      user: user._id,
      organization: org._id,
      role: "owner",
      status: "active",
    });
  }

  const memberships = await getUserMemberships(user._id);

  res.status(201).json({
    success: true,
    token: generateToken(user._id, user.tokenVersion),
    user: toClientUser(user, memberships),
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, "Please provide email and password");

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user) throw new ApiError(401, "Invalid email or password");

  const isMatch = await user.matchPassword(password);
  if (!isMatch) throw new ApiError(401, "Invalid email or password");

  const memberships = await getUserMemberships(user._id);

  res.status(200).json({
    success: true,
    token: generateToken(user._id, user.tokenVersion),
    user: toClientUser(user, memberships),
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const memberships = await getUserMemberships(req.user._id);
  res.status(200).json({
    success: true,
    user: toClientUser(req.user, memberships),
  });
});

import { disconnectUserSockets } from "../utils/socket.js";

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const { name, avatar, password, phone, jobTitle, department, signature } = req.body;

  if (req.body.role || req.body.isSuperAdmin || req.body.workspaces) {
    throw new ApiError(403, "Role or privilege modifications are not allowed via profile update");
  }

  if (name) user.name = name;
  if (avatar !== undefined) user.avatar = avatar;
  if (phone !== undefined) user.phone = phone;
  if (jobTitle !== undefined) user.jobTitle = jobTitle;
  if (department !== undefined) user.department = department;
  if (signature !== undefined) user.signature = signature;

  let passwordChanged = false;
  if (password) {
    user.password = password;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    passwordChanged = true;
  }

  await user.save();

  if (passwordChanged) {
    disconnectUserSockets(user._id);
  }

  const memberships = await getUserMemberships(user._id);

  const responseData = {
    success: true,
    user: toClientUser(user, memberships),
  };

  if (passwordChanged) {
    responseData.token = generateToken(user._id, user.tokenVersion);
    responseData.message = "Password updated successfully. Other active sessions have been revoked.";
  }

  res.json(responseData);
});

export const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!credential) throw new ApiError(400, "Google credential token is required");

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const { name, email, picture } = payload;

  let user = await User.findOne({ email });
  if (user) {
    if (!user.avatar && picture) {
      user.avatar = picture;
      await user.save();
    }
  } else {
    const randomPassword = Math.random().toString(36).slice(-10) + Date.now();
    user = await User.create({ name, email, password: randomPassword, avatar: picture });
    
    const org = await Organization.create({ name: `${name}'s Workspace` });
    await OrganizationMembership.create({ user: user._id, organization: org._id, role: "owner", status: "active" });
  }

  const memberships = await getUserMemberships(user._id);
  const token = generateToken(user._id, user.tokenVersion);

  res.status(200).json({
    success: true,
    token,
    user: toClientUser(user, memberships),
  });
});

// Demo Data is Org-Scoped now!
export const seedDemoData = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const orgId = req.organization._id;

  const daysAgo = (n) => new Date(Date.now() - n * 86400000);
  const daysAhead = (n) => new Date(Date.now() + n * 86400000);

  await Promise.all([
    Lead.deleteMany({ organization: orgId }),
    Contact.deleteMany({ organization: orgId }),
    Note.deleteMany({ organization: orgId }),
    Task.deleteMany({ organization: orgId }),
  ]);

  const createdLeads = [];
  const createdContacts = [];
  const companies = ["Acme Corp", "Globex", "Initech", "Stark Industries"];
  const sources = ["Website", "Referral", "Cold Outreach"];
  const statuses = ["New", "Qualified", "Proposal", "Won", "Lost"];

  for (let i = 0; i < 20; i++) {
    const ageDays = Math.floor(Math.random() * 90);
    const company = companies[Math.floor(Math.random() * companies.length)];
    const status = statuses[Math.floor(Math.random() * 5)];
    const doc = await Lead.create({
      organization: orgId,
      owner: userId,
      name: `Lead ${company} ${i + 1}`,
      company: company,
      email: `contact${i}@${company.toLowerCase().replace(/[^a-z]/g, "")}.com`,
      status: status,
      priority: Math.random() > 0.7 ? "High" : "Medium",
      value: Math.floor(Math.random() * 200000) + 15000,
      createdAt: daysAgo(ageDays),
    });
    createdLeads.push(doc);

    createdContacts.push(
      await Contact.create({
        organization: orgId,
        owner: userId,
        name: `Exec - ${company}`,
        email: `exec@${company.toLowerCase().replace(/[^a-z]/g, "")}.com`,
        company: company,
        createdAt: daysAgo(ageDays),
      })
    );

    if (status === "New") {
      await Task.create({
        organization: orgId,
        owner: userId,
        title: `Follow up with ${company}`,
        relatedLead: doc._id,
        status: "Pending",
        priority: "High",
        dueDate: daysAhead(1),
      });
    }
  }

  res.json({
    success: true,
    message: "Sample demo workspace seeded successfully!",
    leadsCount: createdLeads.length,
    contactsCount: createdContacts.length,
  });
});

const PLAN_PRICES = { free: 0, starter: 499, growth: 1499, business: 2999 };
const PLAN_LIMITS = { free: 50, starter: 500, growth: 999999, business: 999999 };

export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { plan } = req.body;
  if (!plan || !PLAN_PRICES.hasOwnProperty(plan)) throw new ApiError(400, "Invalid plan");

  const basePrice = PLAN_PRICES[plan];
  if (basePrice === 0) return res.json({ success: true, isFree: true, amount: 0 });

  const amountInPaise = Math.round(basePrice * 1.18 * 100);
  const orderId = `order_rzp_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

  res.json({
    success: true,
    orderId,
    amount: amountInPaise,
    currency: "INR",
    keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_revflux_demo",
    plan,
  });
});

export const subscribePlan = asyncHandler(async (req, res) => {
  const { plan, paymentId, orderId, signature } = req.body;
  if (!plan || !PLAN_LIMITS.hasOwnProperty(plan)) throw new ApiError(400, "Invalid subscription plan.");
  if (plan !== "free" && !paymentId) throw new ApiError(402, "Payment verification required.");

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (keySecret && orderId && signature) {
    const expectedSignature = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
    if (expectedSignature !== signature) throw new ApiError(400, "Razorpay payment signature verification failed.");
  }

  const org = await Organization.findById(req.organization._id);
  if (!org) throw new ApiError(404, "Organization not found.");

  org.plan = plan;
  org.subscriptionStatus = "active";
  org.leadLimit = PLAN_LIMITS[plan];
  if (paymentId) {
    org.lastPaymentId = paymentId;
    org.lastBilledAt = new Date();
  }
  await org.save();

  const memberships = await getUserMemberships(req.user._id);

  res.json({
    success: true,
    plan,
    message: `Subscription upgraded to ${plan.toUpperCase()} plan.`,
    paymentId: paymentId || "N/A",
    user: toClientUser(req.user, memberships),
  });
});


// ===============================
// ACCEPT INVITE
// ===============================
export const acceptInvite = asyncHandler(async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    throw new ApiError(400, "Invite token is required");
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const membership = await OrganizationMembership.findOne({
    inviteToken: hashedToken,
    status: "invited",
    inviteTokenExpiresAt: { $gt: Date.now() },
  }).populate("organization");

  if (!membership) {
    throw new ApiError(400, "Invalid or expired invitation token");
  }

  // Bind to current logged-in user
  membership.user = req.user._id;
  membership.status = "active";
  membership.inviteToken = undefined;
  membership.inviteTokenExpiresAt = undefined;
  membership.inviteEmail = undefined;

  await membership.save();

  const memberships = await getUserMemberships(req.user._id);

  res.json({
    success: true,
    message: `You have successfully joined ${membership.organization.name}`,
    user: toClientUser(req.user, memberships),
  });
});

// ===============================
// EMAIL OTP (PASSWORDLESS)
// ===============================

export const requestOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email is required");

  const normalizedEmail = email.toLowerCase().trim();

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(otp, salt);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Send OTP email using centralized email service (SECURITY identity)
  const sendResult = await sendEmail({
    category: EMAIL_CATEGORIES.SECURITY,
    to: normalizedEmail,
    subject: "Your RevFlux Verification Code",
    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
      <h2 style="color: #111827;">RevFlux Verification</h2>
      <p style="color: #4b5563;">Your 6-digit verification code is:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; padding: 12px 24px; background: #f3f4f6; display: inline-block; border-radius: 6px; margin: 16px 0; color: #111827;">${otp}</div>
      <p style="color: #4b5563;">This code will expire in 10 minutes. Do not share it with anyone.</p>
    </div>`,
  });

  if (!sendResult.success) {
    // Invalidate any existing OTP so system is not left in a misleading state
    await EmailOTP.deleteMany({ email: normalizedEmail });
    throw new ApiError(502, "Unable to deliver verification code. Please try again later.");
  }

  // Delivery confirmed (or dev mode without key) - persist OTP record
  await EmailOTP.deleteMany({ email: normalizedEmail });
  await EmailOTP.create({
    email: normalizedEmail,
    otpHash,
    expiresAt,
  });

  // Generic success response
  res.status(200).json({
    success: true,
    message: "If the email is valid, an OTP has been sent.",
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new ApiError(400, "Email and OTP are required");

  const normalizedEmail = email.toLowerCase().trim();

  const otpRecord = await EmailOTP.findOne({ email: normalizedEmail });
  if (!otpRecord) throw new ApiError(400, "Invalid or expired OTP");

  if (otpRecord.expiresAt < new Date()) {
    await EmailOTP.deleteOne({ _id: otpRecord._id });
    throw new ApiError(400, "OTP has expired");
  }

  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    await EmailOTP.deleteOne({ _id: otpRecord._id });
    throw new ApiError(400, "Maximum OTP verification attempts exceeded");
  }

  const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
  if (!isMatch) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    throw new ApiError(400, "Invalid OTP");
  }

  // OTP verified successfully, consume it
  await EmailOTP.deleteOne({ _id: otpRecord._id });

  let user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    const name = normalizedEmail.split("@")[0];
    const randomPassword = crypto.randomBytes(16).toString("hex");
    user = await User.create({ name, email: normalizedEmail, password: randomPassword });
    
    const org = await Organization.create({ name: `${name}'s Workspace` });
    await OrganizationMembership.create({ user: user._id, organization: org._id, role: "owner", status: "active" });
  }

  const memberships = await getUserMemberships(user._id);
  const token = generateToken(user._id, user.tokenVersion);

  res.status(200).json({
    success: true,
    token,
    user: toClientUser(user, memberships),
  });
});

// ===============================
// SESSION REVOCATION
// ===============================
export const revokeSessions = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  if (!user) throw new ApiError(404, "User not found");

  const { password } = req.body || {};
  if (typeof password === "string" && password.trim().length > 0) {
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      throw new ApiError(401, "Invalid password confirmation");
    }
  }

  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  disconnectUserSockets(user._id);

  const memberships = await getUserMemberships(user._id);
  const newToken = generateToken(user._id, user.tokenVersion);

  res.status(200).json({
    success: true,
    message: "All previous sessions have been successfully revoked.",
    token: newToken,
    user: toClientUser(user, memberships),
  });
});