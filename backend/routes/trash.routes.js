import { Router } from "express";
import { getTrash, restoreTrash, purgeTrash } from "../controllers/trash.controller.js";
import { protect, requireOrg } from "../middleware/auth.middleware.js";

const router = Router();

// All trash routes require authentication and an active organization context
router.use(protect);
router.use(requireOrg);

router.get("/", getTrash);
router.get("/:entityType", getTrash);
router.post("/:entityType/:id/restore", restoreTrash);
router.delete("/:entityType/:id/purge", purgeTrash);

export default router;
