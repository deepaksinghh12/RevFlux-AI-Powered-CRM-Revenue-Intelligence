import { Router } from "express";
import {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
} from "../controllers/contact.controller.js";
import { protect, requireOrg } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = Router();

router.use(protect);
router.use(requireOrg);

router
  .route("/")
  .get(requirePermission(PERMISSIONS.CONTACTS_READ), getContacts)
  .post(requirePermission(PERMISSIONS.CONTACTS_CREATE), createContact);

router
  .route("/:id")
  .get(requirePermission(PERMISSIONS.CONTACTS_READ), getContact)
  .put(requirePermission(PERMISSIONS.CONTACTS_UPDATE), updateContact)
  .delete(requirePermission(PERMISSIONS.CONTACTS_DELETE), deleteContact);

export default router;
