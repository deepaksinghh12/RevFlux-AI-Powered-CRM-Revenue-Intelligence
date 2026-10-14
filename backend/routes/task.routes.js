import { Router } from "express";

import {
  getTasks,
  createTask,
  updateTask,
  deleteTask
} from "../controllers/task.controller.js";

import { protect, requireOrg } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = Router();

router.use(protect);
router.use(requireOrg);

router
  .route("/")
  .get(requirePermission(PERMISSIONS.TASKS_READ), getTasks)
  .post(requirePermission(PERMISSIONS.TASKS_CREATE), createTask);

router
  .route("/:id")
  .put(requirePermission(PERMISSIONS.TASKS_UPDATE), updateTask)
  .delete(requirePermission(PERMISSIONS.TASKS_DELETE), deleteTask);

export default router;
