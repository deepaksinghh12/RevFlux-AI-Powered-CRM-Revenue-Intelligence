import User from "../models/User.js";
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

  // Validate required fields
  if (!email || !password) {
    throw new ApiError(
      400,
      "Email and password are required"
    );
  }

  // Find user
  // Password is normally hidden because select:false
  // in User.js, so we explicitly include it here.
  const user = await User.findOne({
    email: email.toLowerCase(),
  }).select("+password");

  if (!user) {
    throw new ApiError(
      401,
      "Invalid email or password"
    );
  }

  // Compare entered password with hashed password
  // stored in MongoDB.
  const valid = await user.matchPassword(password);

  if (!valid) {
    throw new ApiError(
      401,
      "Invalid email or password"
    );
  }

  // Login successful
  res.json({
    success: true,
    token: generateToken(user._id),
    user: toClientUser(user),
  });
});

// ===============================
// GET CURRENT USER
// ===============================

export const getMe = asyncHandler(async (req, res) => {
  // req.user is added by auth middleware
  res.json({
    success: true,
    user: toClientUser(req.user),
  });
});

// ===============================
// UPDATE PROFILE
// ===============================

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, company, avatar, password } = req.body;

  // User is already identified by auth middleware
  const user = req.user;

  // Update only fields that were provided
  if (name !== undefined) {
    user.name = name;
  }

  if (company !== undefined) {
    user.company = company;
  }

  if (avatar !== undefined) {
    user.avatar = avatar;
  }

  if (password !== undefined) {
    user.password = password;
  }

  // Save changes
  // If password was changed, the pre-save
  // middleware in User.js will hash it.
  await user.save();

  res.json({
    success: true,
    user: toClientUser(user),
  });
});

// ===============================
// GOOGLE LOGIN
// ===============================

export const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    throw new ApiError(400, "Google token is required.");
  }

  // Verify the Google ID token
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const { name, email, picture, sub: googleId } = payload;

  // Check if user exists by email
  let user = await User.findOne({ email });

  if (user) {
    // Optional: Update avatar if they didn't have one
    if (!user.avatar && picture) {
      user.avatar = picture;
      await user.save();
    }
  } else {
    // Create new user (Generate a random secure password for local auth)
    // We append the timestamp to ensure uniqueness
    const randomPassword = Math.random().toString(36).slice(-10) + Date.now();
    
    user = await User.create({
      name,
      email,
      password: randomPassword,
      avatar: picture,
      // They don't have a company yet, but we can leave it empty or default it
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