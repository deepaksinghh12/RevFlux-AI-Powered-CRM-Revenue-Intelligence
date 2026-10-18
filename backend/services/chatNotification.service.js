import logger from "../config/logger.js";
import { EMAIL_CATEGORIES } from "../config/email.config.js";
import { sendEmail } from "./email.service.js";
import User from "../models/User.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import { getIO } from "../utils/socket.js";

// In-memory notification cooldown map: `${conversationId}:${userId}` -> timestamp
const notificationCooldowns = new Map();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes debounce

// Clean up stale cooldowns periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of notificationCooldowns.entries()) {
    if (now - timestamp > COOLDOWN_MS * 2) {
      notificationCooldowns.delete(key);
    }
  }
}, COOLDOWN_MS).unref();

/**
 * Basic HTML sanitizer/escaper to prevent XSS in email clients
 */
const escapeHtml = (str) => {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

/**
 * Check if a user currently has an active socket inside the conversation room
 */
const isUserActiveInConversation = (conversationId, userId) => {
  try {
    const io = getIO();
    const roomName = `chat_conv_${conversationId}`;
    const room = io.sockets.adapter.rooms.get(roomName);
    if (!room) return false;

    const targetUserIdStr = userId.toString();
    for (const socketId of room) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket?.user && socket.user._id.toString() === targetUserIdStr) {
        return true;
      }
    }
    return false;
  } catch (err) {
    return false;
  }
};

/**
 * Asynchronously notify eligible participants of a new chat message
 *
 * @param {object} params
 * @param {object} params.conversation - The Mongoose conversation document
 * @param {object} params.message - The saved message document
 * @param {object} params.sender - The sender user object (or populated)
 * @param {string} params.orgName - The organization name
 */
export const notifyChatParticipants = async ({
  conversation,
  message,
  sender,
  orgName = "RevFlux Workspace",
}) => {
  try {
    const senderIdStr = (sender._id || sender.id || sender).toString();
    const senderName = sender.name || "A teammate";
    const convIdStr = conversation._id.toString();
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const chatUrl = `${frontendUrl}/chat?conv=${convIdStr}`;

    // Filter recipients: must be participants, not the sender
    const recipientIds = conversation.participants.filter(
      (pId) => pId.toString() !== senderIdStr
    );

    if (recipientIds.length === 0) return;

    // Check unreadState for preferences & cooldowns
    for (const recipientId of recipientIds) {
      const recipientIdStr = recipientId.toString();

      // 1. Check if recipient is actively viewing the conversation
      if (isUserActiveInConversation(convIdStr, recipientIdStr)) {
        continue;
      }

      // 2. Check conversation notification preference
      const pref = conversation.unreadState?.find(
        (u) => u.user.toString() === recipientIdStr
      );
      if (pref && pref.emailNotifications === false) {
        continue;
      }

      // 3. Check cooldown
      const cooldownKey = `${convIdStr}:${recipientIdStr}`;
      const lastSent = notificationCooldowns.get(cooldownKey);
      if (lastSent && Date.now() - lastSent < COOLDOWN_MS) {
        continue;
      }

      // 4. Verify recipient is still an active member of this organization
      const membership = await OrganizationMembership.findOne({
        user: recipientId,
        organization: conversation.organization,
        status: "active",
      }).populate("user", "email name status");

      if (!membership || !membership.user || membership.user.status !== "active") {
        continue;
      }

      const recipientUser = membership.user;
      if (!recipientUser.email) continue;

      // 5. Build email content
      const previewText = message.text.length > 150
        ? `${message.text.substring(0, 150)}...`
        : message.text;

      const conversationTitle = conversation.type === "group" && conversation.name
        ? `${conversation.name} (${orgName})`
        : `${senderName} in ${orgName}`;

      const subject = `[RevFlux] New message from ${senderName}`;
      const escapedSender = escapeHtml(senderName);
      const escapedTitle = escapeHtml(conversationTitle);
      const escapedPreview = escapeHtml(previewText);

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
            .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
            .header { background: #4f46e5; padding: 20px 24px; color: #ffffff; }
            .header h1 { margin: 0; font-size: 18px; font-weight: 600; }
            .content { padding: 24px; }
            .bubble { background: #f1f5f9; border-left: 4px solid #4f46e5; border-radius: 6px; padding: 14px 16px; margin: 16px 0; font-size: 15px; line-height: 1.5; color: #334155; }
            .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 12px; }
            .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Team Chat &bull; ${escapedTitle}</h1>
            </div>
            <div class="content">
              <p><strong>${escapedSender}</strong> sent a new message:</p>
              <div class="bubble">
                ${escapedPreview}
              </div>
              <a href="${chatUrl}" class="btn">Reply in RevFlux</a>
            </div>
            <div class="footer">
              <p>You received this because you are an active member of ${escapeHtml(orgName)}. You can manage chat email notifications inside the RevFlux app.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // 6. Asynchronously send via centralized email service
      sendEmail({
        category: EMAIL_CATEGORIES.NOTIFICATIONS,
        to: recipientUser.email,
        subject,
        html,
        text: `${senderName}: "${previewText}"\n\nReply at: ${chatUrl}`,
      })
        .then((res) => {
          if (res?.success) {
            notificationCooldowns.set(cooldownKey, Date.now());
          }
        })
        .catch((err) => {
          logger.error(`Failed to send chat email notification: ${err.message}`);
        });
    }
  } catch (err) {
    logger.error(`Error in notifyChatParticipants: ${err.message}`);
  }
};
