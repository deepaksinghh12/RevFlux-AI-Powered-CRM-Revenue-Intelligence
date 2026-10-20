import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import EmailOTP from "../models/EmailOTP.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { generateToken } from "../utils/generateToken.js";
import { toClientUser, getUserMemberships } from "./auth.controller.js";
import logger from "../config/logger.js";
import { sendEmail } from "../services/email.service.js";
import { EMAIL_CATEGORIES } from "../config/email.config.js";
import {
  getMicrosoftConfig,
  generateOidcParams,
  buildAuthorizationUrl,
  signStateCookie,
  verifyStateCookie,
  sanitizeReturnTo,
  exchangeCodeForTokens,
  validateIdToken,
  createLinkingTicket,
  verifyLinkingTicket,
  createExchangeCode,
  consumeExchangeCode,
} from "../services/microsoftAuth.service.js";

const COOKIE_NAME = "ms_auth_session";

/**
 * Parses HTTP Cookie header into key-value map
 */
const parseCookies = (cookieHeader = "") => {
  const map = {};
  if (!cookieHeader) return map;
  const items = cookieHeader.split(";");
  for (const item of items) {
    const [rawKey, ...rawVal] = item.trim().split("=");
    if (rawKey) {
      map[rawKey.trim()] = decodeURIComponent(rawVal.join("=").trim());
    }
  }
  return map;
};

/**
 * Serializes a cookie string with standard security attributes
 */
const serializeCookie = (name, value, maxAgeSeconds = 900) => {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isProd) {
    parts.push("Secure");
  }
  return parts.join("; ");
};

/**
 * Initiates Microsoft Entra ID OIDC authorization code flow
 * GET /api/auth/microsoft
 */
export const startMicrosoftAuth = asyncHandler(async (req, res) => {
  const config = getMicrosoftConfig();
  if (!config.isConfigured) {
    throw new ApiError(503, "Microsoft authentication is not enabled or configured");
  }

  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const returnTo = sanitizeReturnTo(req.query.returnTo, clientUrl);

  const { state, nonce, codeVerifier, codeChallenge } = generateOidcParams();

  // Store security context in tamper-proof HMAC-signed cookie
  const sessionPayload = {
    state,
    nonce,
    codeVerifier,
    returnTo,
    createdAt: Date.now(),
  };

  const signedCookie = signStateCookie(sessionPayload);
  res.setHeader("Set-Cookie", serializeCookie(COOKIE_NAME, signedCookie, 900));

  const authUrl = buildAuthorizationUrl({
    state,
    nonce,
    codeChallenge,
    config,
  });

  if (req.query.format === "json") {
    return res.status(200).json({ success: true, authUrl });
  }

  res.redirect(authUrl);
});

/**
 * Handles Microsoft Entra ID callback
 * Delivers a short-lived, single-use exchange code (ms_code) instead of a JWT.
 * GET /api/auth/microsoft/callback
 */
export const handleMicrosoftCallback = asyncHandler(async (req, res) => {
  const config = getMicrosoftConfig();
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  let targetReturnTo = clientUrl;

  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = cookies[COOKIE_NAME];

  // Helper to redirect to frontend with sanitized error and clear cookie
  const redirectWithError = (errorMessage) => {
    res.setHeader("Set-Cookie", serializeCookie(COOKIE_NAME, "", 0));
    const safeError = encodeURIComponent(errorMessage || "Authentication failed");
    return res.redirect(`${targetReturnTo}/login?error=${safeError}`);
  };

  if (!sessionCookie) {
    return redirectWithError("Your sign-in session expired or was interrupted. Please try again.");
  }

  // Clear cookie immediately to prevent replay
  res.setHeader("Set-Cookie", serializeCookie(COOKIE_NAME, "", 0));

  let session;
  try {
    session = verifyStateCookie(sessionCookie);
    if (session.returnTo) {
      targetReturnTo = sanitizeReturnTo(session.returnTo, clientUrl);
    }
  } catch (err) {
    logger.warn("Invalid Microsoft state cookie:", err.message);
    return redirectWithError("Invalid authentication state session. Please try again.");
  }

  // Check for provider errors or user cancellation
  const { error, error_description: errorDescription, code, state } = req.query;

  if (error) {
    if (error === "access_denied") {
      return redirectWithError("Sign-in was cancelled by the user.");
    }
    logger.warn("Microsoft authorization error callback:", { error, errorDescription });
    return redirectWithError("Microsoft authentication request was denied by the identity provider.");
  }

  if (!code || !state) {
    return redirectWithError("Missing authorization code or state parameter from provider.");
  }

  // Verify CSRF state
  if (state !== session.state) {
    logger.warn("Microsoft CSRF state mismatch detected");
    return redirectWithError("Security verification failed (state mismatch). Please try again.");
  }

  // Exchange authorization code for tokens
  let tokenResponse;
  try {
    tokenResponse = await exchangeCodeForTokens({
      code,
      codeVerifier: session.codeVerifier,
      config,
    });
  } catch (err) {
    logger.error("Failed to exchange Microsoft authorization code:", err.message);
    // Sanitize user-facing error message to prevent diagnostic leakage
    return redirectWithError("Microsoft token exchange was rejected by the identity provider.");
  }

  // Validate ID Token (signature, issuer, aud, exp, nonce, tenant policy)
  let verifiedIdentity;
  try {
    verifiedIdentity = await validateIdToken({
      idToken: tokenResponse.id_token,
      expectedNonce: session.nonce,
      config,
    });
  } catch (err) {
    logger.error("Microsoft ID token validation failure:", err.message);
    return redirectWithError("Invalid Microsoft identity token received.");
  }

  const { oid, tid, microsoftId, email, name } = verifiedIdentity;

  if (!email) {
    return redirectWithError("Unable to retrieve verified email address from Microsoft identity token.");
  }

  // Case 1: Existing user with linked microsoftId
  let user = await User.findOne({ microsoftId });

  if (user) {
    if (user.status && user.status !== "active") {
      return redirectWithError("This account is currently deactivated or suspended. Please contact your workspace administrator.");
    }

    // Issue single-use exchange code instead of JWT in URL
    const exchangeCode = await createExchangeCode({
      userId: user._id,
      tokenVersion: user.tokenVersion || 0,
    });

    return res.redirect(`${targetReturnTo}/login?ms_code=${encodeURIComponent(exchangeCode)}`);
  }

  // Case 2: User exists with this email but is NOT linked to this microsoftId
  // Safe Account Linking Requirement: NEVER silently link or take over existing account!
  const existingEmailUser = await User.findOne({ email });

  if (existingEmailUser) {
    // Generate secure linking ticket requiring password or OTP confirmation
    const ticket = createLinkingTicket({
      email,
      microsoftId,
      microsoftTenantId: tid,
      microsoftObjectId: oid,
      name,
    });

    return res.redirect(
      `${targetReturnTo}/login?link_required=true&email=${encodeURIComponent(email)}&ticket=${encodeURIComponent(ticket)}`
    );
  }

  // Case 3: Completely new user — create account and default workspace
  try {
    const randomPassword = crypto.randomBytes(24).toString("hex");
    user = await User.create({
      name,
      email,
      password: randomPassword,
      microsoftId,
      microsoftTenantId: tid,
      microsoftObjectId: oid,
    });

    const org = await Organization.create({
      name: `${name}'s Workspace`,
    });

    await OrganizationMembership.create({
      user: user._id,
      organization: org._id,
      role: "owner",
      status: "active",
    });
  } catch (createErr) {
    // Handle concurrent creation duplicate-key edge cases (E11000)
    if (createErr.code === 11000) {
      user = await User.findOne({ microsoftId });
      if (!user) {
        // Email was created concurrently — route through explicit account linking
        const ticket = createLinkingTicket({
          email,
          microsoftId,
          microsoftTenantId: tid,
          microsoftObjectId: oid,
          name,
        });
        return res.redirect(
          `${targetReturnTo}/login?link_required=true&email=${encodeURIComponent(email)}&ticket=${encodeURIComponent(ticket)}`
        );
      }
    } else {
      logger.error("Failed to provision new Microsoft user:", createErr);
      return redirectWithError("Failed to create user account. Please try again.");
    }
  }

  // Issue single-use exchange code instead of JWT in URL
  const exchangeCode = await createExchangeCode({
    userId: user._id,
    tokenVersion: user.tokenVersion || 0,
  });

  return res.redirect(`${targetReturnTo}/login?ms_code=${encodeURIComponent(exchangeCode)}`);
});

/**
 * Exchanges a short-lived authorization code for a native RevFlux JWT session
 * Atomically consumes the code to guarantee single-use.
 * POST /api/auth/microsoft/exchange
 */
export const exchangeMicrosoftCode = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== "string") {
    throw new ApiError(400, "Authorization exchange code is required");
  }

  // Atomically find, verify unconsumed, verify unexpired, and consume
  const record = await consumeExchangeCode(code);
  if (!record) {
    throw new ApiError(401, "Invalid, expired, or previously used authorization code");
  }

  const user = await User.findById(record.user);
  if (!user || (user.status && user.status !== "active")) {
    throw new ApiError(401, "User account is inactive or no longer exists");
  }

  // Validate tokenVersion to respect session revocation
  if ((user.tokenVersion || 0) !== (record.tokenVersion || 0)) {
    throw new ApiError(401, "Session has been revoked. Please sign in again.");
  }

  const memberships = await getUserMemberships(user._id);
  const token = generateToken(user._id, user.tokenVersion);

  res.status(200).json({
    success: true,
    token,
    user: toClientUser(user, memberships),
  });
});

/**
 * Requests an Email OTP verification code to link an existing passwordless account
 * POST /api/auth/microsoft/link/request-otp
 */
export const requestLinkingOtp = asyncHandler(async (req, res) => {
  const { ticket } = req.body;
  if (!ticket || typeof ticket !== "string") {
    throw new ApiError(400, "Account linking ticket is required");
  }

  // Strictly derive target user email from verified ticket, not browser input
  const ticketData = verifyLinkingTicket(ticket);
  const normalizedEmail = ticketData.email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new ApiError(404, "User account not found");
  }

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(otp, salt);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes TTL

  // Send verification code using centralized email service
  const sendResult = await sendEmail({
    category: EMAIL_CATEGORIES.SECURITY,
    to: normalizedEmail,
    subject: "Your RevFlux Account Linking Verification Code",
    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
      <h2 style="color: #111827;">Link Your Microsoft Account</h2>
      <p style="color: #4b5563;">You requested to link your Microsoft account to your existing RevFlux account. Your 6-digit verification code is:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; padding: 12px 24px; background: #f3f4f6; display: inline-block; border-radius: 6px; margin: 16px 0; color: #111827;">${otp}</div>
      <p style="color: #4b5563;">This code will expire in 10 minutes. If you did not initiate this request, you can safely ignore this email.</p>
    </div>`,
  });

  if (!sendResult.success) {
    await EmailOTP.deleteMany({ email: normalizedEmail });
    throw new ApiError(502, "Unable to deliver verification code. Please try again later.");
  }

  await EmailOTP.deleteMany({ email: normalizedEmail });
  await EmailOTP.create({
    email: normalizedEmail,
    otpHash,
    expiresAt,
  });

  res.status(200).json({
    success: true,
    message: "If the account exists, a verification code has been sent.",
  });
});

/**
 * Completes explicit and secure account linking with existing account credentials (password OR email OTP)
 * POST /api/auth/microsoft/link
 */
export const linkMicrosoftAccount = asyncHandler(async (req, res) => {
  const { ticket, password, otp } = req.body;

  if (!ticket) {
    throw new ApiError(400, "Linking ticket is required");
  }

  if (!password && !otp) {
    throw new ApiError(400, "Either account password or email verification code (OTP) is required to link accounts");
  }

  // Derive target user and identity strictly from verified ticket
  const ticketData = verifyLinkingTicket(ticket);
  const { email, microsoftId, microsoftTenantId, microsoftObjectId } = ticketData;
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail }).select("+password");
  if (!user) {
    throw new ApiError(404, "User account not found");
  }

  if (user.status && user.status !== "active") {
    throw new ApiError(401, "Account is deactivated or suspended");
  }

  // Verification Path A: Password
  if (password) {
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      throw new ApiError(401, "Incorrect password. Account linking failed.");
    }
  }
  // Verification Path B: Email OTP (for passwordless Google or OTP users)
  else if (otp) {
    const otpRecord = await EmailOTP.findOne({ email: normalizedEmail });
    if (!otpRecord) {
      throw new ApiError(400, "Invalid or expired verification code");
    }

    if (otpRecord.expiresAt < new Date()) {
      await EmailOTP.deleteOne({ _id: otpRecord._id });
      throw new ApiError(400, "Verification code has expired");
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await EmailOTP.deleteOne({ _id: otpRecord._id });
      throw new ApiError(400, "Maximum verification attempts exceeded. Please request a new code.");
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new ApiError(400, "Invalid verification code");
    }

    // OTP verified successfully — consume it atomically
    await EmailOTP.deleteOne({ _id: otpRecord._id });
  }

  // Verify that neither this user nor this microsoftId is already attached elsewhere
  if (user.microsoftId && user.microsoftId !== microsoftId) {
    throw new ApiError(409, "This RevFlux account is already linked to a different Microsoft identity.");
  }

  const existingLinked = await User.findOne({ microsoftId });
  if (existingLinked && existingLinked._id.toString() !== user._id.toString()) {
    throw new ApiError(409, "This Microsoft account is already linked to another RevFlux user.");
  }

  // Link account and update identity
  user.microsoftId = microsoftId;
  user.microsoftTenantId = microsoftTenantId;
  user.microsoftObjectId = microsoftObjectId;
  await user.save();

  logger.info(`Microsoft identity ${microsoftId} successfully linked to user ${user.email}`);

  const memberships = await getUserMemberships(user._id);
  const token = generateToken(user._id, user.tokenVersion);

  res.status(200).json({
    success: true,
    message: "Microsoft account successfully linked.",
    token,
    user: toClientUser(user, memberships),
  });
});

/**
 * Returns public Microsoft configuration for frontend UI display
 * GET /api/auth/microsoft/config
 */
export const getMicrosoftClientConfig = asyncHandler(async (req, res) => {
  const config = getMicrosoftConfig();
  res.status(200).json({
    success: true,
    enabled: config.isConfigured,
    tenantPolicy: config.tenantPolicy,
  });
});
