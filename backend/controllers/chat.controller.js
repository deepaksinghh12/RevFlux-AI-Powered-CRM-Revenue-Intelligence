import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { getIO } from "../utils/socket.js";
import { notifyChatParticipants } from "../services/chatNotification.service.js";

/**
 * List all conversations for the user in the active organization
 */
export const getConversations = asyncHandler(async (req, res) => {
  const orgId = req.organization._id;
  const userId = req.user._id;

  const conversations = await Conversation.find({
    organization: orgId,
    participants: userId,
  })
    .sort({ lastActivityAt: -1 })
    .populate("participants", "name email avatar jobTitle department status")
    .populate("lastMessage.sender", "name email avatar");

  // Map memberId for all participants in this organization
  const allParticipantIds = [
    ...new Set(
      conversations.flatMap((c) => c.participants.map((p) => (p._id || p).toString()))
    ),
  ];
  const memberships = await OrganizationMembership.find({
    organization: orgId,
    user: { $in: allParticipantIds },
  }).select("user memberId");

  const memberIdMap = new Map(
    memberships.map((m) => [m.user.toString(), m.memberId])
  );

  const formatted = conversations.map((conv) => {
    const userUnread = conv.unreadState?.find(
      (u) => u.user.toString() === userId.toString()
    );

    return {
      id: conv._id,
      type: conv.type,
      name: conv.name,
      participants: conv.participants.map((p) => ({
        _id: p._id,
        id: p._id,
        name: p.name,
        email: p.email,
        avatar: p.avatar,
        jobTitle: p.jobTitle,
        department: p.department,
        status: p.status,
        memberId: memberIdMap.get(p._id.toString()) || null,
      })),
      lastMessage: conv.lastMessage,
      lastActivityAt: conv.lastActivityAt,
      unreadCount: userUnread ? userUnread.unreadCount : 0,
      emailNotifications: userUnread ? userUnread.emailNotifications : true,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    };
  });

  res.json({
    success: true,
    count: formatted.length,
    conversations: formatted,
  });
});

/**
 * Get or create a direct conversation with a teammate
 */
export const getOrCreateDirectConversation = asyncHandler(async (req, res) => {
  const { recipientId } = req.body;
  const orgId = req.organization._id;
  const userId = req.user._id;

  if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
    throw new ApiError(400, "Valid recipientId is required");
  }

  if (recipientId.toString() === userId.toString()) {
    throw new ApiError(400, "Cannot start a direct conversation with yourself");
  }

  // Validate recipient belongs to the same organization and is active
  const recipientMembership = await OrganizationMembership.findOne({
    user: recipientId,
    organization: orgId,
    status: "active",
  }).populate("user", "status");

  if (!recipientMembership || !recipientMembership.user || recipientMembership.user.status !== "active") {
    throw new ApiError(404, "Teammate not found in this organization");
  }

  // Find existing direct conversation with exactly these two participants
  let conversation = await Conversation.findOne({
    organization: orgId,
    type: "direct",
    participants: { $all: [userId, recipientId], $size: 2 },
  })
    .populate("participants", "name email avatar jobTitle department status")
    .populate("lastMessage.sender", "name email avatar");

  if (!conversation) {
    conversation = await Conversation.create({
      organization: orgId,
      type: "direct",
      participants: [userId, recipientId],
      unreadState: [
        { user: userId, unreadCount: 0, lastReadAt: new Date(), emailNotifications: true },
        { user: recipientId, unreadCount: 0, lastReadAt: new Date(), emailNotifications: true },
      ],
      lastActivityAt: new Date(),
    });

    conversation = await Conversation.findById(conversation._id)
      .populate("participants", "name email avatar jobTitle department status")
      .populate("lastMessage.sender", "name email avatar");
  }

  const userUnread = conversation.unreadState?.find(
    (u) => u.user.toString() === userId.toString()
  );

  const participantIds = conversation.participants.map((p) => (p._id || p).toString());
  const memberships = await OrganizationMembership.find({
    organization: orgId,
    user: { $in: participantIds },
  }).select("user memberId");
  const memberIdMap = new Map(memberships.map((m) => [m.user.toString(), m.memberId]));

  const formattedParticipants = conversation.participants.map((p) => ({
    _id: p._id,
    id: p._id,
    name: p.name,
    email: p.email,
    avatar: p.avatar,
    jobTitle: p.jobTitle,
    department: p.department,
    status: p.status,
    memberId: memberIdMap.get(p._id.toString()) || null,
  }));

  res.json({
    success: true,
    conversation: {
      id: conversation._id,
      type: conversation.type,
      name: conversation.name,
      participants: formattedParticipants,
      lastMessage: conversation.lastMessage,
      lastActivityAt: conversation.lastActivityAt,
      unreadCount: userUnread ? userUnread.unreadCount : 0,
      emailNotifications: userUnread ? userUnread.emailNotifications : true,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    },
  });
});

/**
 * Create a new group conversation
 */
export const createGroupConversation = asyncHandler(async (req, res) => {
  const { name, participantIds } = req.body;
  const orgId = req.organization._id;
  const userId = req.user._id;

  if (!name || typeof name !== "string" || !name.trim()) {
    throw new ApiError(400, "Group conversation name is required");
  }

  if (name.trim().length > 100) {
    throw new ApiError(400, "Group name cannot exceed 100 characters");
  }

  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    throw new ApiError(400, "At least one teammate must be selected for a group");
  }

  // Deduplicate and ensure current user is included
  const participantSet = new Set(participantIds.map((id) => id.toString()));
  participantSet.add(userId.toString());
  const cleanParticipantIds = Array.from(participantSet);

  for (const pId of cleanParticipantIds) {
    if (!mongoose.Types.ObjectId.isValid(pId)) {
      throw new ApiError(400, `Invalid participant ID: ${pId}`);
    }
  }

  // Validate all participants are active members of this organization
  const activeMembers = await OrganizationMembership.find({
    user: { $in: cleanParticipantIds },
    organization: orgId,
    status: "active",
  }).populate("user", "status");

  if (activeMembers.length !== cleanParticipantIds.length) {
    throw new ApiError(400, "One or more participants are not active members of this workspace");
  }

  const unreadState = cleanParticipantIds.map((id) => ({
    user: id,
    unreadCount: 0,
    lastReadAt: new Date(),
    emailNotifications: true,
  }));

  let conversation = await Conversation.create({
    organization: orgId,
    type: "group",
    name: name.trim(),
    participants: cleanParticipantIds,
    unreadState,
    lastActivityAt: new Date(),
  });

  conversation = await Conversation.findById(conversation._id)
    .populate("participants", "name email avatar jobTitle department status")
    .populate("lastMessage.sender", "name email avatar");

  // Broadcast creation to personal rooms of all participants via Socket.IO
  try {
    const io = getIO();
    for (const pId of cleanParticipantIds) {
      io.to(pId).emit("chat:conversation_created", {
        conversationId: conversation._id.toString(),
        name: conversation.name,
      });
    }
  } catch (err) {
    // Socket not ready or outside server
  }

  const groupParticipantIds = conversation.participants.map((p) => (p._id || p).toString());
  const groupMemberships = await OrganizationMembership.find({
    organization: orgId,
    user: { $in: groupParticipantIds },
  }).select("user memberId");
  const groupMemberIdMap = new Map(groupMemberships.map((m) => [m.user.toString(), m.memberId]));

  const formattedGroupParticipants = conversation.participants.map((p) => ({
    _id: p._id,
    id: p._id,
    name: p.name,
    email: p.email,
    avatar: p.avatar,
    jobTitle: p.jobTitle,
    department: p.department,
    status: p.status,
    memberId: groupMemberIdMap.get(p._id.toString()) || null,
  }));

  res.status(201).json({
    success: true,
    conversation: {
      id: conversation._id,
      type: conversation.type,
      name: conversation.name,
      participants: formattedGroupParticipants,
      lastMessage: conversation.lastMessage,
      lastActivityAt: conversation.lastActivityAt,
      unreadCount: 0,
      emailNotifications: true,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    },
  });
});

/**
 * Get paginated message history for a conversation
 */
export const getMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.organization._id;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Conversation not found");
  }

  // Fails closed: check org scope AND user participation in one atomic query
  const conversation = await Conversation.findOne({
    _id: id,
    organization: orgId,
    participants: userId,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  const before = req.query.before;

  const query = {
    conversation: id,
    organization: orgId,
  };

  if (before) {
    if (mongoose.Types.ObjectId.isValid(before)) {
      query._id = { $lt: before };
    } else if (!isNaN(Date.parse(before))) {
      query.createdAt = { $lt: new Date(before) };
    }
  }

  const rawMessages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .populate("sender", "name email avatar jobTitle");

  const hasMore = rawMessages.length > limit;
  const messages = hasMore ? rawMessages.slice(0, limit) : rawMessages;

  // Return chronological order (oldest to newest)
  messages.reverse();

  // Automatic delivery acknowledgement for fetched messages
  const unDeliveredIds = messages
    .filter(
      (m) =>
        m.sender?._id?.toString() !== userId.toString() &&
        !m.deliveredTo?.some((d) => (d.user?._id || d.user || d).toString() === userId.toString())
    )
    .map((m) => m._id);

  if (unDeliveredIds.length > 0) {
    const now = new Date();
    await Message.updateMany(
      { _id: { $in: unDeliveredIds } },
      { $push: { deliveredTo: { user: userId, deliveredAt: now } } }
    );

    for (const m of messages) {
      if (unDeliveredIds.some((uid) => uid.toString() === m._id.toString())) {
        m.deliveredTo = [...(m.deliveredTo || []), { user: userId, deliveredAt: now }];
      }
    }

    try {
      const io = getIO();
      const receiptPayload = {
        conversationId: id.toString(),
        messageIds: unDeliveredIds.map((uid) => uid.toString()),
        userId: userId.toString(),
        deliveredAt: now.toISOString(),
      };
      io.to(`chat_conv_${id}`).emit("chat:delivery_receipt", receiptPayload);
      for (const pId of conversation.participants) {
        io.to(pId.toString()).emit("chat:delivery_receipt", receiptPayload);
      }
    } catch (err) {}
  }

  res.json({
    success: true,
    count: messages.length,
    hasMore,
    messages: messages.map((m) => ({
      id: m._id,
      conversationId: m.conversation,
      sender: m.sender,
      text: m.text,
      deliveredTo: m.deliveredTo || [],
      readBy: m.readBy || [],
      clientMessageId: m.clientMessageId,
      createdAt: m.createdAt,
    })),
  });
});

/**
 * Send a message via REST fallback
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { text, clientMessageId } = req.body;
  const orgId = req.organization._id;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Conversation not found");
  }

  if (!text || typeof text !== "string" || !text.trim()) {
    throw new ApiError(400, "Message text is required");
  }

  if (text.trim().length > 4000) {
    throw new ApiError(400, "Message cannot exceed 4000 characters");
  }

  const conversation = await Conversation.findOne({
    _id: id,
    organization: orgId,
    participants: userId,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  // Idempotency check: if clientMessageId already processed for this conversation, return existing message
  if (clientMessageId && typeof clientMessageId === "string") {
    const existingMsg = await Message.findOne({
      conversation: id,
      clientMessageId: clientMessageId.trim(),
    }).populate("sender", "name email avatar jobTitle");

    if (existingMsg) {
      return res.status(200).json({
        success: true,
        message: {
          id: existingMsg._id,
          conversationId: existingMsg.conversation,
          sender: existingMsg.sender,
          text: existingMsg.text,
          readBy: existingMsg.readBy,
          clientMessageId: existingMsg.clientMessageId,
          createdAt: existingMsg.createdAt,
        },
      });
    }
  }

  const message = await Message.create({
    organization: orgId,
    conversation: id,
    sender: userId,
    text: text.trim(),
    clientMessageId: clientMessageId && typeof clientMessageId === "string" ? clientMessageId.trim() : undefined,
    readBy: [{ user: userId, readAt: new Date() }],
  });

  // Update conversation lastMessage & lastActivityAt
  conversation.lastMessage = {
    text: message.text,
    sender: userId,
    createdAt: message.createdAt,
  };
  conversation.lastActivityAt = message.createdAt;

  // Increment unread count for other participants
  if (conversation.unreadState && conversation.unreadState.length > 0) {
    for (const state of conversation.unreadState) {
      if (state.user.toString() !== userId.toString()) {
        state.unreadCount = (state.unreadCount || 0) + 1;
      }
    }
  }
  await conversation.save();

  const populatedMessage = await Message.findById(message._id).populate(
    "sender",
    "name email avatar jobTitle"
  );

  const formattedMsg = {
    id: populatedMessage._id,
    conversationId: populatedMessage.conversation,
    sender: populatedMessage.sender,
    text: populatedMessage.text,
    deliveredTo: populatedMessage.deliveredTo || [],
    readBy: populatedMessage.readBy || [],
    clientMessageId: populatedMessage.clientMessageId,
    createdAt: populatedMessage.createdAt,
  };

  // Broadcast via Socket.IO
  try {
    const io = getIO();
    io.to(`chat_conv_${id}`).emit("chat:new_message", formattedMsg);
    for (const pId of conversation.participants) {
      io.to(pId.toString()).emit("chat:conversation_updated", {
        conversationId: id.toString(),
        lastMessage: conversation.lastMessage,
        lastActivityAt: conversation.lastActivityAt,
      });
    }
  } catch (err) {
    // Socket broadcast fail-safe
  }

  // Asynchronous Resend email notifications
  notifyChatParticipants({
    conversation,
    message: populatedMessage,
    sender: req.user,
    orgName: req.organization.name,
  }).catch(() => {});

  res.status(201).json({
    success: true,
    message: formattedMsg,
  });
});

/**
 * Mark a conversation as read for the current user
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.organization._id;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Conversation not found");
  }

  const conversation = await Conversation.findOne({
    _id: id,
    organization: orgId,
    participants: userId,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  const now = new Date();
  if (conversation.unreadState) {
    const userState = conversation.unreadState.find(
      (u) => u.user.toString() === userId.toString()
    );
    if (userState) {
      userState.unreadCount = 0;
      userState.lastReadAt = now;
      await conversation.save();
    }
  }

  // Update deliveredTo on undelivered messages in this conversation for this user
  await Message.updateMany(
    {
      conversation: id,
      sender: { $ne: userId },
      "deliveredTo.user": { $ne: userId },
    },
    {
      $push: { deliveredTo: { user: userId, deliveredAt: now } },
    }
  );

  // Update readBy on unread messages in this conversation (excluding sender's own messages)
  await Message.updateMany(
    {
      conversation: id,
      sender: { $ne: userId },
      "readBy.user": { $ne: userId },
    },
    {
      $push: { readBy: { user: userId, readAt: now } },
    }
  );

  // Broadcast read receipt via Socket.IO
  try {
    const io = getIO();
    const receiptPayload = {
      conversationId: id.toString(),
      userId: userId.toString(),
      readAt: now.toISOString(),
    };
    io.to(`chat_conv_${id}`).emit("chat:read_receipt", receiptPayload);
    for (const pId of conversation.participants) {
      io.to(pId.toString()).emit("chat:read_receipt", receiptPayload);
    }
  } catch (err) {}

  res.json({
    success: true,
    message: "Conversation marked as read",
  });
});

/**
 * Acknowledge receipt of messages (delivery receipt via REST)
 */
export const markAsDelivered = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { messageIds } = req.body;
  const orgId = req.organization._id;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Conversation not found");
  }

  const conversation = await Conversation.findOne({
    _id: id,
    organization: orgId,
    participants: userId,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  const validIds = Array.isArray(messageIds)
    ? messageIds.filter((mid) => mongoose.Types.ObjectId.isValid(mid))
    : [];

  if (validIds.length === 0) {
    return res.json({ success: true, count: 0 });
  }

  const now = new Date();
  const result = await Message.updateMany(
    {
      _id: { $in: validIds },
      conversation: id,
      sender: { $ne: userId },
      "deliveredTo.user": { $ne: userId },
    },
    {
      $push: { deliveredTo: { user: userId, deliveredAt: now } },
    }
  );

  // Broadcast via Socket.IO
  try {
    const io = getIO();
    const receiptPayload = {
      conversationId: id.toString(),
      messageIds: validIds.map((mid) => mid.toString()),
      userId: userId.toString(),
      deliveredAt: now.toISOString(),
    };
    io.to(`chat_conv_${id}`).emit("chat:delivery_receipt", receiptPayload);
    for (const pId of conversation.participants) {
      io.to(pId.toString()).emit("chat:delivery_receipt", receiptPayload);
    }
  } catch (err) {}

  res.json({
    success: true,
    modifiedCount: result.modifiedCount,
  });
});

/**
 * Update user preferences for chat notifications
 */
export const updatePreferences = asyncHandler(async (req, res) => {
  const { conversationId, emailNotifications } = req.body;
  const orgId = req.organization._id;
  const userId = req.user._id;

  if (conversationId) {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new ApiError(400, "Invalid conversationId");
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      organization: orgId,
      participants: userId,
    });

    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }

    const userState = conversation.unreadState?.find(
      (u) => u.user.toString() === userId.toString()
    );
    if (userState) {
      userState.emailNotifications = Boolean(emailNotifications);
      await conversation.save();
    }
  }

  res.json({
    success: true,
    message: "Chat preferences updated successfully",
  });
});

/**
 * Get active teammates in current organization for starting chats
 */
export const getTeammates = asyncHandler(async (req, res) => {
  const orgId = req.organization._id;
  const currentUserId = req.user._id.toString();
  const query = req.query.q ? req.query.q.trim().toLowerCase() : null;

  const memberships = await OrganizationMembership.find({
    organization: orgId,
    status: "active",
  }).populate("user", "name email avatar jobTitle department status");

  let teammates = memberships
    .filter((m) => m.user && m.user.status === "active")
    .map((m) => ({
      id: m.user._id,
      membershipId: m._id,
      memberId: m.memberId || null,
      memberSeq: m.memberSeq || null,
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatar,
      jobTitle: m.user.jobTitle,
      department: m.user.department,
      role: m.role,
      isCurrentUser: m.user._id.toString() === currentUserId,
    }));

  if (query) {
    teammates = teammates.filter((t) => {
      const nameMatch = t.name?.toLowerCase().includes(query);
      const emailMatch = t.email?.toLowerCase().includes(query);
      const memberIdMatch = t.memberId?.toLowerCase().includes(query);
      return nameMatch || emailMatch || memberIdMatch;
    });
  }

  res.json({
    success: true,
    count: teammates.length,
    teammates,
  });
});
