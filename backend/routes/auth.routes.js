import { Router } from "express";

import {
  register,
  login,
  googleLogin,
  getMe,
  updateProfile,
  seedDemoData,
  subscribePlan,
} from "../controllers/auth.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { authRateLimiter } from "../middleware/rateLimit.middleware.js";
import { authSchemas } from "../validators/schemas.js";

const router = Router();

router.post("/register", authRateLimiter, validateBody(authSchemas.register), register);
router.post("/login", authRateLimiter, validateBody(authSchemas.login), login);
router.post("/google", authRateLimiter, googleLogin);

router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.post("/seed-demo", protect, seedDemoData);
router.post("/subscribe", protect, validateBody(authSchemas.subscribe), subscribePlan);

export default router;