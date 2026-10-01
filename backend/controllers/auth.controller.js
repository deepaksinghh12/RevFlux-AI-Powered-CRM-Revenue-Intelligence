import User from "../models/User.js";
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

// Convert user document into safe object for frontend
// Password is intentionally excluded.
// Convert user document into safe object for frontend
// Password is intentionally excluded.
const toClientUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role || "owner",
  company: user.company || "",
  avatar: user.avatar || "",
  phone: user.phone || "",
  jobTitle: user.jobTitle || "Sales Leader",
  department: user.department || "Revenue Operations",
  signature: user.signature || "",
  plan: user.plan || "free",
  subscriptionStatus: user.subscriptionStatus || "trialing",
  leadLimit: user.leadLimit ?? 50,
  aiCallCount: user.aiCallCount ?? 0,
  lastPaymentId: user.lastPaymentId || "",
  lastBilledAt: user.lastBilledAt || null,
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

  const { name, company, avatar, password, phone, jobTitle, department, signature, role } = req.body;

  if (name) user.name = name;
  if (company !== undefined) user.company = company;
  if (avatar !== undefined) user.avatar = avatar;
  if (password) user.password = password;
  if (phone !== undefined) user.phone = phone;
  if (jobTitle !== undefined) user.jobTitle = jobTitle;
  if (department !== undefined) user.department = department;
  if (signature !== undefined) user.signature = signature;
  if (role && ["superadmin", "owner", "ops_head", "manager", "rep"].includes(role)) user.role = role;

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

  const createdLeads = [];
  const createdContacts = [];
  const companies = ["Acme Corp", "Globex", "Initech", "Stark Industries", "Umbrella Co", "Wayne Ent.", "Cyberdyne", "Tyrell Corp", "Massive Dynamic", "Hooli", "Pied Piper", "Soylent", "Oscorp"];
  const sources = ["Website", "Referral", "Cold Outreach", "Event", "LinkedIn"];
  const statuses = ["New", "Qualified", "Proposal", "Won", "Lost"];

  // Generate 80 random leads spanning up to 2 years (730 days)
  for (let i = 0; i < 80; i++) {
    const ageDays = Math.floor(Math.random() * 730);
    const company = companies[Math.floor(Math.random() * companies.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];
    const value = Math.floor(Math.random() * 200000) + 15000;
    
    // Logic for status based on age
    let status;
    if (ageDays < 15) {
      status = statuses[Math.floor(Math.random() * 3)]; // New, Qualified, Proposal
    } else {
      status = Math.random() > 0.4 ? "Won" : "Lost";
    }

    const doc = await Lead.create({
      owner: userId,
      name: `Lead ${company} ${i + 1}`,
      company: company,
      email: `contact${i}@${company.toLowerCase().replace(/[^a-z]/g, "")}.com`,
      status: status,
      priority: Math.random() > 0.7 ? "High" : "Medium",
      source: source,
      value: value,
      notes: "Sample lead seeded during workspace onboarding.",
      tags: ["sample", status.toLowerCase()],
      aiRiskScore: status === "Won" ? 10 : (status === "Lost" ? 90 : Math.floor(Math.random() * 60) + 20),
      createdAt: daysAgo(ageDays),
      updatedAt: daysAgo(Math.max(0, ageDays - Math.floor(Math.random() * 30))),
    });
    createdLeads.push(doc);

    // Create 1-2 Contacts per lead
    const contactCount = Math.floor(Math.random() * 2) + 1;
    for (let c = 0; c < contactCount; c++) {
      createdContacts.push(
        await Contact.create({
          owner: userId,
          name: `Exec ${c + 1} - ${company}`,
          email: `exec${c + 1}@${company.toLowerCase().replace(/[^a-z]/g, "")}.com`,
          phone: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
          company: company,
          jobTitle: c === 0 ? "CEO" : "VP of Sales",
          createdAt: daysAgo(ageDays),
        })
      );
    }

    // Create a few Notes for this lead
    await Note.create({
      owner: userId,
      relatedLead: doc._id,
      content: `Initial discovery call with ${company}. They are looking for a new solution to scale operations. Budget looks promising.`,
      createdAt: daysAgo(ageDays - 1),
    });

    if (status === "Won") {
      await Note.create({
        owner: userId,
        relatedLead: doc._id,
        content: `Contract signed! Excellent closing from the team.`,
        createdAt: daysAgo(Math.max(0, ageDays - 20)),
      });
    }

    // Create Tasks for this lead
    if (status === "New" || status === "Qualified" || status === "Proposal") {
      await Task.create({
        owner: userId,
        title: `Follow up with ${company} on proposal`,
        relatedLead: doc._id,
        status: "Pending",
        priority: "High",
        dueDate: daysAhead(Math.floor(Math.random() * 7) + 1),
      });
    } else {
      await Task.create({
        owner: userId,
        title: `Onboarding check-in for ${company}`,
        relatedLead: doc._id,
        status: "Completed",
        priority: "Medium",
        dueDate: daysAgo(Math.floor(Math.random() * 30)),
      });
    }
  }

  res.json({
    success: true,
    message: "Sample demo workspace seeded successfully with 2 years of history!",
    leadsCount: createdLeads.length,
    contactsCount: createdContacts.length,
  });
});

const PLAN_PRICES = {
  free: 0,
  starter: 499,
  growth: 1499,
  business: 2999,
};

const PLAN_LIMITS = {
  free: 50,
  starter: 500,
  growth: 999999,
  business: 999999,
};

// ===============================
// CREATE RAZORPAY ORDER
// ===============================
export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { plan } = req.body;
  if (!plan || !PLAN_PRICES.hasOwnProperty(plan)) {
    throw new ApiError(400, "Invalid subscription plan selected.");
  }

  const basePrice = PLAN_PRICES[plan];
  if (basePrice === 0) {
    return res.json({ success: true, isFree: true, amount: 0 });
  }

  const amountInPaise = Math.round(basePrice * 1.18 * 100); // Base price + 18% GST in paise
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

// ===============================
// SUBSCRIBE / VERIFY RAZORPAY PAYMENT (Task 7.2)
// ===============================
export const subscribePlan = asyncHandler(async (req, res) => {
  const { plan, paymentId, orderId, signature, paymentMethod } = req.body;

  if (!plan || !PLAN_LIMITS.hasOwnProperty(plan)) {
    throw new ApiError(400, "Invalid subscription plan selected.");
  }

  // Paid plans require a payment transaction ID from the gateway
  if (plan !== "free" && !paymentId) {
    throw new ApiError(402, "Payment verification required for paid plan upgrade.");
  }

  // HMAC SHA256 Signature Verification if Razorpay Secret is configured
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (keySecret && orderId && signature) {
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expectedSignature !== signature) {
      throw new ApiError(400, "Razorpay payment signature verification failed.");
    }
  }

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found.");

  user.plan = plan;
  user.subscriptionStatus = "active";
  user.leadLimit = PLAN_LIMITS[plan];
  if (paymentId) {
    user.lastPaymentId = paymentId;
    user.lastBilledAt = new Date();
  }
  await user.save();

  res.json({
    success: true,
    message: `Razorpay Payment Verified! Subscription upgraded to ${plan.toUpperCase()} plan.`,
    paymentId: paymentId || "N/A",
    user: toClientUser(user),
  });
});