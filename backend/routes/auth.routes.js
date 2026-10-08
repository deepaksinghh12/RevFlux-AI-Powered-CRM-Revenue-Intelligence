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
} from "../controllers/auth.controller.js";

import { protect, requireOrg } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { authRateLimiter, otpRequestLimiter, otpVerifyLimiter } from "../middleware/rateLimit.middleware.js";
import { authSchemas } from "../validators/schemas.js";

const router = Router();

router.post("/register", authRateLimiter, validateBody(authSchemas.register), register);
router.post("/login", authRateLimiter, validateBody(authSchemas.login), login);
router.post("/google", authRateLimiter, googleLogin);

router.post("/otp/request", otpRequestLimiter, requestOtp);
router.post("/otp/verify", otpVerifyLimiter, verifyOtp);

router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.post("/seed-demo", protect, requireOrg, seedDemoData);
router.post("/create-razorpay-order", protect, requireOrg, createRazorpayOrder);
router.post("/subscribe", protect, requireOrg, validateBody(authSchemas.subscribe), subscribePlan);
router.post("/accept-invite", protect, acceptInvite);

export default router;