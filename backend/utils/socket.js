import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { notifyChatParticipants } from "../services/chatNotification.service.js";

let io;

// Track online users: Map<userIdStr, Set<socketId>>
const onlineUsers = new Map();

// Track recent message timestamps per user for rate limiting (max 10 msgs / 5 sec)
const messageTimestamps = new Map();

export const initSocket = (server) => {
  const clientUrls = (process.env.CLIENT_URL || "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  const allowedOrigins = [
    ...clientUrls,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
  ];

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (
          !origin ||
          allowedOrigins.includes(origin) ||
          (origin && origin.endsWith(".vercel.app")) ||
          process.env.NODE_ENV !== "production"
        ) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication error: No token provided"));

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return next(new Error("Authentication error: Invalid or expired token"));
      }

      const user = await User.findById(decoded.id);
      if (!user) return next(new Error("Authentication error: User not found"));

      // Reject deactivated or suspended user accounts
      if (user.status && user.status !== "active") {
        return next(new Error("Authentication error: Account is deactivated or suspended"));
      }

      // Check tokenVersion
      const currentVersion = user.tokenVersion ?? 0;
      const tokenVersion = decoded.tv;

      if (tokenVersion !== undefined && tokenVersion !== null) {
        if (Number(tokenVersion) !== currentVersion) {
          return next(new Error("Authentication error: Session has been revoked"));
        }
      } else {
        if (currentVersion !== 0) {
          return next(new Error("Authentication error: Session has been revoked"));
        }
      }

      socket.user = user;
      socket.tokenVersion = currentVersion;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userIdStr = socket.user._id.toString();

    // Register online presence
    if (!onlineUsers.has(userIdStr)) {
      onlineUsers.set(userIdStr, new Set());
    }
    onlineUsers.get(userIdStr).add(socket.id);

    // Auto-join personal room for direct targeted notifications
    socket.join(userIdStr);

    // Helper to verify user status and session validity on events
    const verifySocketSession = async () => {
      const freshUser = await User.findById(socket.user._id);
      if (!freshUser || (freshUser.status && freshUser.status !== "active")) {
        socket.emit("error", { message: "Account suspended or deactivated" });
        socket.disconnect(true);
        return false;
      }
      if ((freshUser.tokenVersion ?? 0) !== (socket.tokenVersion ?? 0)) {
        socket.emit("error", { message: "Session revoked" });
        socket.disconnect(true);
        return false;
      }
      socket.user = freshUser;
      return true;
    };

    // Client explicitly joins an organization room
    socket.on("join_org", async (orgId) => {
      try {
        if (!orgId) return;

        const sessionValid = await verifySocketSession();
        if (!sessionValid) return;

        const membership = await OrganizationMembership.findOne({
          user: socket.user._id,
          organization: orgId,
          status: "active",
        });

        if (!membership) {
          return socket.emit("error", { message: "Access denied to this organization's room" });
        }

        const roomName = `org_${orgId}`;
        socket.join(roomName);

        // Notify organization room about user online presence
        io.to(roomName).emit("chat:presence_update", {
          userId: userIdStr,
          status: "online",
        });
      } catch (err) {
        socket.emit("error", { message: "Failed to join organization room" });
      }
    });

    // Query online teammates in current organization
    socket.on("chat:get_online_teammates", async (orgId, callback) => {
      try {
        if (!orgId) return;
        const sessionValid = await verifySocketSession();
        if (!sessionValid) return;

        const membership = await OrganizationMembership.findOne({
          user: socket.user._id,
          organization: orgId,
          status: "active",
        });

        if (!membership) {
          if (typeof callback === "function") callback({ error: "Access denied" });
          return;
        }

        const orgMembers = await OrganizationMembership.find({
          organization: orgId,
          status: "active",
        }).select("user");

        const onlineIds = orgMembers
          .map((m) => m.user?.toString())
          .filter((id) => id && onlineUsers.has(id) && onlineUsers.get(id).size > 0);

        if (typeof callback === "function") {
          callback({ success: true, onlineUserIds: onlineIds });
        }
      } catch (err) {
        if (typeof callback === "function") callback({ error: err.message });
      }
    });

    // ============================================
    // Realtime Team Chat Events
    // ============================================

    // Join a specific conversation room
    socket.on("chat:join_conversation", async (conversationId, callback) => {
      try {
        if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
          if (typeof callback === "function") callback({ error: "Invalid conversation ID" });
          return;
        }

        const sessionValid = await verifySocketSession();
        if (!sessionValid) return;

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.user._id,
        });

        if (!conversation) {
          if (typeof callback === "function") callback({ error: "Conversation not found or access denied" });
          return socket.emit("error", { message: "Access denied to conversation" });
        }

        // Verify active membership in the conversation's organization
        const membership = await OrganizationMembership.findOne({
          user: socket.user._id,
          organization: conversation.organization,
          status: "active",
        });

        if (!membership) {
          if (typeof callback === "function") callback({ error: "Access denied: Inactive organization membership" });
          return socket.emit("error", { message: "Access denied to conversation" });
        }

        const convRoom = `chat_conv_${conversationId}`;
        socket.join(convRoom);

        if (typeof callback === "function") {
          callback({ success: true, conversationId });
        }
      } catch (err) {
        if (typeof callback === "function") callback({ error: "Failed to join conversation" });
      }
    });

    // Leave a specific conversation room
    socket.on("chat:leave_conversation", (conversationId) => {
      if (conversationId) {
        socket.leave(`chat_conv_${conversationId}`);
      }
    });

    // Send a chat message via Socket.IO
    socket.on("chat:send_message", async (data, callback) => {
      try {
        if (!data || !data.conversationId || typeof data.text !== "string") {
          if (typeof callback === "function") callback({ error: "Invalid message payload" });
          return;
        }

        const sessionValid = await verifySocketSession();
        if (!sessionValid) return;

        const text = data.text.trim();
        if (!text) {
          if (typeof callback === "function") callback({ error: "Message cannot be empty" });
          return;
        }

        if (text.length > 4000) {
          if (typeof callback === "function") callback({ error: "Message exceeds 4000 character limit" });
          return;
        }

        // Enforce rate limiting: sliding window of max 10 messages per 5 seconds
        const now = Date.now();
        let userTimestamps = messageTimestamps.get(userIdStr) || [];
        userTimestamps = userTimestamps.filter((t) => now - t < 5000);
        if (userTimestamps.length >= 10) {
          if (typeof callback === "function") {
            callback({ error: "Rate limit exceeded. Please slow down." });
          }
          return socket.emit("error", { message: "Rate limit exceeded" });
        }
        userTimestamps.push(now);
        messageTimestamps.set(userIdStr, userTimestamps);

        // Verify conversation and participation
        const conversation = await Conversation.findOne({
          _id: data.conversationId,
          participants: socket.user._id,
        });

        if (!conversation) {
          if (typeof callback === "function") callback({ error: "Conversation not found or access denied" });
          return socket.emit("error", { message: "Access denied" });
        }

        // Verify active organization membership
        const membership = await OrganizationMembership.findOne({
          user: socket.user._id,
          organization: conversation.organization,
          status: "active",
        });

        if (!membership) {
          socket.leave(`chat_conv_${conversation._id}`);
          if (typeof callback === "function") callback({ error: "Access denied: Membership inactive" });
          return socket.emit("error", { message: "Access denied" });
        }

        // Idempotency check: if clientMessageId already processed for this conversation, return existing message
        if (data.clientMessageId && typeof data.clientMessageId === "string") {
          const existing = await Message.findOne({
            conversation: conversation._id,
            clientMessageId: data.clientMessageId.trim(),
          });

          if (existing) {
            const formattedExisting = {
              id: existing._id,
              conversationId: existing.conversation,
              sender: {
                _id: socket.user._id,
                name: socket.user.name,
                avatar: socket.user.avatar,
                email: socket.user.email,
                jobTitle: socket.user.jobTitle,
              },
              text: existing.text,
              readBy: existing.readBy,
              clientMessageId: existing.clientMessageId,
              createdAt: existing.createdAt,
            };
            if (typeof callback === "function") callback({ success: true, message: formattedExisting });
            return;
          }
        }

        // 1. Persist the message in MongoDB before broadcasting
        const message = await Message.create({
          organization: conversation.organization,
          conversation: conversation._id,
          sender: socket.user._id,
          text,
          clientMessageId: data.clientMessageId && typeof data.clientMessageId === "string" ? data.clientMessageId.trim() : undefined,
          readBy: [{ user: socket.user._id, readAt: new Date() }],
        });

        // 2. Update conversation metadata
        conversation.lastMessage = {
          text: message.text,
          sender: socket.user._id,
          createdAt: message.createdAt,
        };
        conversation.lastActivityAt = message.createdAt;

        // Increment unread count for other participants
        if (conversation.unreadState && conversation.unreadState.length > 0) {
          for (const state of conversation.unreadState) {
            if (state.user.toString() !== userIdStr) {
              state.unreadCount = (state.unreadCount || 0) + 1;
            }
          }
        }
        await conversation.save();

        const formattedMsg = {
          id: message._id,
          conversationId: conversation._id,
          sender: {
            _id: socket.user._id,
            name: socket.user.name,
            avatar: socket.user.avatar,
            email: socket.user.email,
            jobTitle: socket.user.jobTitle,
          },
          text: message.text,
          deliveredTo: message.deliveredTo || [],
          readBy: message.readBy || [],
          clientMessageId: message.clientMessageId,
          createdAt: message.createdAt,
        };

        // 3. Broadcast to all active sockets in the conversation room
        const convRoom = `chat_conv_${conversation._id}`;
        io.to(convRoom).emit("chat:new_message", formattedMsg);

        // 4. Broadcast conversation update to each participant's personal room
        for (const pId of conversation.participants) {
          io.to(pId.toString()).emit("chat:conversation_updated", {
            conversationId: conversation._id.toString(),
            lastMessage: conversation.lastMessage,
            lastActivityAt: conversation.lastActivityAt,
          });
        }

        // 5. Acknowledge sender callback
        if (typeof callback === "function") {
          callback({ success: true, message: formattedMsg });
        }

        // 6. Asynchronously dispatch Resend email notification
        Organization.findById(conversation.organization)
          .then((org) => {
            notifyChatParticipants({
              conversation,
              message: formattedMsg,
              sender: socket.user,
              orgName: org?.name || "RevFlux Workspace",
            }).catch(() => {});
          })
          .catch(() => {});
      } catch (err) {
        if (typeof callback === "function") callback({ error: "Failed to send message" });
      }
    });

    // Acknowledge message delivery by an authenticated recipient
    socket.on("chat:message_delivered", async (data, callback) => {
      try {
        if (!data || !data.conversationId) {
          if (typeof callback === "function") callback({ error: "Invalid payload" });
          return;
        }

        const sessionValid = await verifySocketSession();
        if (!sessionValid) return;

        const conversation = await Conversation.findOne({
          _id: data.conversationId,
          participants: socket.user._id,
        });

        if (!conversation) {
          if (typeof callback === "function") callback({ error: "Conversation not found or access denied" });
          return;
        }

        const messageIds = [];
        if (data.messageId && mongoose.Types.ObjectId.isValid(data.messageId)) {
          messageIds.push(data.messageId);
        }
        if (Array.isArray(data.messageIds)) {
          for (const mId of data.messageIds) {
            if (mongoose.Types.ObjectId.isValid(mId)) {
              messageIds.push(mId);
            }
          }
        }

        if (messageIds.length === 0) {
          if (typeof callback === "function") callback({ success: true, count: 0 });
          return;
        }

        const now = new Date();
        const updateResult = await Message.updateMany(
          {
            _id: { $in: messageIds },
            conversation: data.conversationId,
            sender: { $ne: socket.user._id },
            "deliveredTo.user": { $ne: socket.user._id },
          },
          {
            $push: { deliveredTo: { user: socket.user._id, deliveredAt: now } },
          }
        );

        const convRoom = `chat_conv_${data.conversationId}`;
        const receiptPayload = {
          conversationId: data.conversationId.toString(),
          messageIds: messageIds.map((id) => id.toString()),
          userId: userIdStr,
          deliveredAt: now.toISOString(),
        };

        io.to(convRoom).emit("chat:delivery_receipt", receiptPayload);
        for (const pId of conversation.participants) {
          io.to(pId.toString()).emit("chat:delivery_receipt", receiptPayload);
        }

        if (typeof callback === "function") {
          callback({ success: true, updatedCount: updateResult.modifiedCount });
        }
      } catch (err) {
        if (typeof callback === "function") callback({ error: "Failed to acknowledge delivery" });
      }
    });

    // Typing start/stop indicator
    socket.on("chat:typing", async (data) => {
      try {
        if (!data || !data.conversationId) return;

        // Broadcast to conversation room excluding sender
        socket.to(`chat_conv_${data.conversationId}`).emit("chat:user_typing", {
          conversationId: data.conversationId,
          userId: userIdStr,
          userName: socket.user.name || "Teammate",
          isTyping: Boolean(data.isTyping),
        });
      } catch (err) {}
    });

    // Mark conversation read via Socket.IO
    socket.on("chat:mark_read", async (data, callback) => {
      try {
        if (!data || !data.conversationId || !mongoose.Types.ObjectId.isValid(data.conversationId)) {
          if (typeof callback === "function") callback({ error: "Invalid conversation ID" });
          return;
        }

        const sessionValid = await verifySocketSession();
        if (!sessionValid) return;

        const conversation = await Conversation.findOne({
          _id: data.conversationId,
          participants: socket.user._id,
        });

        if (!conversation) {
          if (typeof callback === "function") callback({ error: "Conversation not found" });
          return;
        }

        const now = new Date();
        if (conversation.unreadState) {
          const userState = conversation.unreadState.find(
            (u) => u.user.toString() === userIdStr
          );
          if (userState) {
            userState.unreadCount = 0;
            userState.lastReadAt = now;
            await conversation.save();
          }
        }

        // Also ensure all unread messages are marked delivered
        await Message.updateMany(
          {
            conversation: data.conversationId,
            sender: { $ne: socket.user._id },
            "deliveredTo.user": { $ne: socket.user._id },
          },
          {
            $push: { deliveredTo: { user: socket.user._id, deliveredAt: now } },
          }
        );

        await Message.updateMany(
          {
            conversation: data.conversationId,
            sender: { $ne: socket.user._id },
            "readBy.user": { $ne: socket.user._id },
          },
          {
            $push: { readBy: { user: socket.user._id, readAt: now } },
          }
        );

        const convRoom = `chat_conv_${data.conversationId}`;
        const readPayload = {
          conversationId: data.conversationId.toString(),
          userId: userIdStr,
          readAt: now.toISOString(),
        };

        io.to(convRoom).emit("chat:read_receipt", readPayload);
        for (const pId of conversation.participants) {
          io.to(pId.toString()).emit("chat:read_receipt", readPayload);
        }

        if (typeof callback === "function") {
          callback({ success: true });
        }
      } catch (err) {
        if (typeof callback === "function") callback({ error: "Failed to mark as read" });
      }
    });

    // Legacy team message support
    socket.on("team:send_message", async (data) => {
      if (!data) return;
      const orgId = data.organizationId;
      if (!orgId) return;

      const sessionValid = await verifySocketSession();
      if (!sessionValid) return;

      const membership = await OrganizationMembership.findOne({
        user: socket.user._id,
        organization: orgId,
        status: "active",
      });

      if (!membership) {
        socket.leave(`org_${orgId}`);
        return socket.emit("error", { message: "Access denied: Membership inactive or suspended" });
      }

      const text = typeof data.text === "string" ? data.text.trim() : "";
      if (!text) return;

      const roomName = `org_${orgId}`;
      io.to(roomName).emit("team:new_message", {
        id: Date.now().toString(),
        senderId: socket.user._id.toString(),
        senderName: socket.user.name || "Team Member",
        senderAvatar: socket.user.avatar || "",
        text,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => {
      if (onlineUsers.has(userIdStr)) {
        const userSockets = onlineUsers.get(userIdStr);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userIdStr);
          // Broadcast offline status strictly to the organizations this user actively belongs to
          OrganizationMembership.find({ user: socket.user._id, status: "active" })
            .select("organization")
            .then((memberships) => {
              for (const m of memberships) {
                io.to(`org_${m.organization}`).emit("chat:presence_update", {
                  userId: userIdStr,
                  status: "offline",
                });
              }
            })
            .catch(() => {});
        }
      }
    });
  });

  return io;
};

/**
 * Disconnect all active sockets for a specific user ID across all connections.
 * Called upon session revocation or password change.
 */
export const disconnectUserSockets = (userId) => {
  if (!io) return;
  const targetId = userId.toString();
  for (const [, socket] of io.sockets.sockets) {
    if (socket.user && socket.user._id.toString() === targetId) {
      socket.emit("error", { message: "Session revoked by server" });
      socket.disconnect(true);
    }
  }
};

/**
 * Disconnect sockets of a specific user or remove them from an organization's room.
 * Called when a membership is suspended or removed.
 */
export const revokeOrgRoomAccess = async (userId, orgId) => {
  if (!io) return;
  const targetId = userId.toString();
  const roomName = `org_${orgId}`;

  // Find all conversations in this organization to evict user from conversation rooms
  try {
    const orgConversations = await Conversation.find({ organization: orgId }).select("_id");
    const convRoomNames = orgConversations.map((c) => `chat_conv_${c._id}`);

    for (const [, socket] of io.sockets.sockets) {
      if (socket.user && socket.user._id.toString() === targetId) {
        socket.leave(roomName);
        for (const cRoom of convRoomNames) {
          socket.leave(cRoom);
        }
        socket.emit("error", { message: "Access to workspace room revoked" });
      }
    }
  } catch (err) {
    for (const [, socket] of io.sockets.sockets) {
      if (socket.user && socket.user._id.toString() === targetId) {
        socket.leave(roomName);
        socket.emit("error", { message: "Access to workspace room revoked" });
      }
    }
  }
};

/**
 * Emit an event to a user's connected socket(s) notifying them that their
 * role or permissions in an organization have changed, triggering a live refresh.
 */
export const notifyUserPermissionsChanged = (userId, orgId, changes = {}) => {
  if (!io) return;
  const targetId = userId.toString();
  for (const [, socket] of io.sockets.sockets) {
    if (socket.user && socket.user._id.toString() === targetId) {
      socket.emit("permissions:updated", {
        organizationId: orgId.toString(),
        ...changes,
      });
    }
  }
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
