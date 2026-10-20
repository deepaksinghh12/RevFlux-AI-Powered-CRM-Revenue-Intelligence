import {
  startMicrosoftAuth,
  handleMicrosoftCallback,
  exchangeMicrosoftCode,
  linkMicrosoftAccount,
  requestLinkingOtp,
  getMicrosoftClientConfig,
} from "../controllers/microsoftAuth.controller.js";
import { Router } from "express";

import {
  register,
  login,
  googleLogin,
  getMe,
  updateProfile,
  seedDemoData,
  subscribePlan,
  createRazorpayOrder,
  acceptInvite,
  requestOtp,
  verifyOtp,
  revokeSessions,
} from "../controllers/auth.controller.js";

import { protect, requireOrg } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { authRateLimiter, otpRequestLimiter, otpVerifyLimiter } from "../middleware/rateLimit.middleware.js";
import { authSchemas } from "../validators/schemas.js";

const router = Router();

router.post("/register", authRateLimiter, validateBody(authSchemas.register), register);
router.post("/login", authRateLimiter, validateBody(authSchemas.login), login);
router.post("/google", authRateLimiter, googleLogin);

// Microsoft Entra ID (OIDC) Authentication & Account Linking
router.get("/microsoft", authRateLimiter, startMicrosoftAuth);
router.get("/microsoft/callback", handleMicrosoftCallback);
router.post("/microsoft/exchange", authRateLimiter, exchangeMicrosoftCode);
router.post("/microsoft/link", authRateLimiter, linkMicrosoftAccount);
router.post("/microsoft/link/request-otp", otpRequestLimiter, requestLinkingOtp);
router.get("/microsoft/config", getMicrosoftClientConfig);

router.post("/otp/request", otpRequestLimiter, requestOtp);
router.post("/otp/verify", otpVerifyLimiter, verifyOtp);

router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.post("/account/revoke-sessions", protect, revokeSessions);
router.post("/seed-demo", protect, requireOrg, seedDemoData);
router.post("/create-razorpay-order", protect, requireOrg, createRazorpayOrder);
router.post("/subscribe", protect, requireOrg, validateBody(authSchemas.subscribe), subscribePlan);
router.post("/accept-invite", protect, acceptInvite);

export default router;