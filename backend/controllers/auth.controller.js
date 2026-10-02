import User from "../models/User.js";
import Organization from "../models/Organization.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import { Lead } from "../models/Lead.js";
import { Contact } from "../models/Contact.js";
import { Note } from "../models/Note.js";
import { Task } from "../models/Task.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { generateToken } from "../utils/generateToken.js";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const toClientUser = (user, memberships = []) => ({
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
    role: m.role,
    status: m.status,
    plan: m.organization.plan,
    leadLimit: m.organization.leadLimit,
    subscriptionStatus: m.organization.subscriptionStatus,
  }))
});

// Helper to fetch and auto-accept memberships
const getUserMemberships = async (userId) => {
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
    token: generateToken(user._id),
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
    token: generateToken(user._id),
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

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const { name, avatar, password, phone, jobTitle, department, signature } = req.body;

  if (name) user.name = name;
  if (avatar !== undefined) user.avatar = avatar;
  if (phone !== undefined) user.phone = phone;
  if (jobTitle !== undefined) user.jobTitle = jobTitle;
  if (department !== undefined) user.department = department;
  if (signature !== undefined) user.signature = signature;

  if (password) {
    user.password = password;
  }

  await user.save();
  const memberships = await getUserMemberships(user._id);

  res.json({
    success: true,
    user: toClientUser(user, memberships),
  });
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
  const token = generateToken(user._id);

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
    message: `Subscription upgraded to ${plan.toUpperCase()} plan.`,
    paymentId: paymentId || "N/A",
    user: toClientUser(req.user, memberships),
  });
});