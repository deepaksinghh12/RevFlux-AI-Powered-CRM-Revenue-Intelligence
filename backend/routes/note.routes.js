import { Router } from "express";

import {
  getNotes,
  createNote,
  updateNote,
  deleteNote
} from "../controllers/note.controller.js";

import { protect, requireOrg } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect);
router.use(requireOrg);

router
  .route("/")
  .get(getNotes)
  .post(createNote);

router
  .route("/:id")
  .put(updateNote)
  .delete(deleteNote);

export default router;
