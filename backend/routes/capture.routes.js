import { Router } from "express";
import { captureLead } from "../controllers/capture.controller.js";

const router = Router();

// Public route - no auth required
router.post("/:ownerId", captureLead);

export default router;
