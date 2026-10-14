import { Router } from "express";

import {
  getNotes,
  createNote,
  updateNote,
  deleteNote
} from "../controllers/note.controller.js";

import { protect, requireOrg } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = Router();

router.use(protect);
router.use(requireOrg);

router
  .route("/")
  .get(requirePermission(PERMISSIONS.NOTES_READ), getNotes)
  .post(requirePermission(PERMISSIONS.NOTES_CREATE), createNote);

router
  .route("/:id")
  .put(requirePermission(PERMISSIONS.NOTES_UPDATE), updateNote)
  .delete(requirePermission(PERMISSIONS.NOTES_DELETE), deleteNote);

export default router;
