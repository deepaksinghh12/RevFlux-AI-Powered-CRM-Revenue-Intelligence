import { Router } from "express";
import { protect, requireOrg } from "../middleware/auth.middleware.js";
import {
  getConversations,
  getOrCreateDirectConversation,
  createGroupConversation,
  getMessages,
  sendMessage,
  markAsRead,
  markAsDelivered,
  updatePreferences,
  getTeammates,
} from "../controllers/chat.controller.js";

const router = Router();

// Protect all chat routes with authentication and organization verification
router.use(protect, requireOrg);

router.get("/conversations", getConversations);
router.post("/conversations/direct", getOrCreateDirectConversation);
router.post("/conversations/group", createGroupConversation);
router.get("/conversations/:id/messages", getMessages);
router.post("/conversations/:id/messages", sendMessage);
router.patch("/conversations/:id/read", markAsRead);
router.post("/conversations/:id/delivered", markAsDelivered);
router.patch("/preferences", updatePreferences);
router.get("/teammates", getTeammates);

export default router;
