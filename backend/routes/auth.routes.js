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

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);

router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.post("/seed-demo", protect, seedDemoData);
router.post("/subscribe", protect, subscribePlan);

export default router;