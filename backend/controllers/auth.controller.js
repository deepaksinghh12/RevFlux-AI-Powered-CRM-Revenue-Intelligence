import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { generateToken } from "../utils/generateToken.js";

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