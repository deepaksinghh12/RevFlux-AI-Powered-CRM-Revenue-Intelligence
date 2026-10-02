import jwt from "jsonwebtoken";
import User from "../models/User.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

// 1. Verify JWT and inject req.user
export const protect = asyncHandler(async (req, res, next) => {
  let token;
  const header = req.headers.authorization;

  if (header && header.startsWith("Bearer ")) {
    token = header.split(" ")[1];
  }

  if (!token) {
    throw new ApiError(401, "Not authorized, no token provided");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new ApiError(401, "Not authorized, token invalid or expired");
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new ApiError(401, "Not authorized, user no longer exists");
  }

  req.user = user;
  next();
});

// 2. Ensure request targets a valid organization for this user
export const requireOrg = asyncHandler(async (req, res, next) => {
  const orgId = req.header("X-Organization-Id") || req.body.organizationId || req.query.organizationId;
  
  if (!orgId) {
    throw new ApiError(400, "Missing X-Organization-Id header");
  }

  const membership = await OrganizationMembership.findOne({
    user: req.user._id,
    organization: orgId,
    status: "active"
  }).populate("organization");

  if (!membership) {
    throw new ApiError(403, "Access denied to this workspace");
  }

  req.membership = membership;
  req.organization = membership.organization;
  next();
});