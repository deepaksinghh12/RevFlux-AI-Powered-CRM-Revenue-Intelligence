import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MessageSquare,
  Users,
  UserPlus,
  Send,
  Search,
  Bell,
  BellOff,
  Check,
  CheckCheck,
} from "lucide-react";
import {
  Button,
  Avatar,
  Input,
  Dialog,
  Spinner,
  Badge,
} from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { chatApi } from "../lib/services";
import { toast } from "sonner";
import { cn } from "../lib/utils";

const getUserId = (u) => {
  if (!u) return "";
  if (typeof u === "string") return u;
  if (u._id) return u._id.toString();
  if (u.id) return u.id.toString();
  if (typeof u.toString === "function") return u.toString();
  return "";
};

export default function Chat() {
  const { user, activeOrg } = useAuth();
  const { socket, onlineUserIds } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(
    searchParams.get("conv") || null
  );
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");

  // Teammates & Modals
  const [teammates, setTeammates] = useState([]);
  const [directModalOpen, setDirectModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupTeammates, setSelectedGroupTeammates] = useState([]);
  const [teammateSearch, setTeammateSearch] = useState("");

  // Typing
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutRef = useRef(null);

  // Scroll ref & Request ref
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const activeRequestIdRef = useRef(0);

  const currentUserId = getUserId(user);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  // 1. Fetch Conversations
  const fetchConversations = async (preserveActiveId = null) => {
    try {
      const res = await chatApi.getConversations();
      if (res.conversations) {
        const convs = res.conversations;
        setConversations(convs);

        const requested = searchParams.get("conv");
        const candidateId = preserveActiveId || requested || activeConversationId;
        const matched = convs.find((c) => c.id === candidateId);

        if (matched) {
          setActiveConversationId(matched.id);
        } else if (convs.length > 0) {
          setActiveConversationId(convs[0].id);
          setSearchParams({ conv: convs[0].id }, { replace: true });
        } else {
          setActiveConversationId(null);
          setSearchParams({}, { replace: true });
        }
      }
    } catch (err) {
      toast.error("Failed to load conversations", { description: err.message });
    } finally {
      setLoadingConversations(false);
    }
  };

  // 2. Fetch Teammates for Starting Chats
  const fetchTeammates = async () => {
    try {
      const res = await chatApi.getTeammates();
      if (res.teammates) {
        setTeammates(res.teammates);
      }
    } catch (err) {
      console.error("Failed to load teammates:", err.message);
    }
  };

  useEffect(() => {
    if (activeOrg) {
      fetchConversations();
      fetchTeammates();
    }
  }, [activeOrg]);

  // Sync activeConversationId with URL query
  useEffect(() => {
    const requested = searchParams.get("conv");
    if (requested && requested !== activeConversationId) {
      setActiveConversationId(requested);
    }
  }, [searchParams]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  // 3. Load Messages when Active Conversation changes
  const loadMessages = useCallback(
    async (convId, isSilent = false) => {
      if (!convId) {
        setMessages([]);
        setLoadingMessages(false);
        return;
      }

      // If conversations are loaded and activeConversationId is not among them, reset cleanly
      if (conversations.length > 0 && !conversations.some((c) => c.id === convId)) {
        setMessages([]);
        setLoadingMessages(false);
        return;
      }

      const currentReqId = ++activeRequestIdRef.current;
      if (!isSilent) {
        setLoadingMessages(true);
      }
      setTypingUsers({});

      try {
        const res = await chatApi.getMessages(convId, { limit: 50 });
        if (currentReqId !== activeRequestIdRef.current) return;

        const incoming = res?.messages || [];
        setMessages((prev) => {
          if (prev.length === 0) return incoming;
          const merged = [...incoming];
          for (const m of prev) {
            const mKey = (m.clientMessageId || m.id || m._id || "").toString();
            if (
              mKey &&
              !merged.some(
                (existing) => (existing.clientMessageId || existing.id || existing._id || "").toString() === mKey
              )
            ) {
              merged.push(m);
            }
          }
          return merged;
        });

        setHasMoreMessages(res?.hasMore || false);

        // Mark as read ONLY if document is genuinely visible
        if (document.visibilityState === "visible") {
          chatApi.markAsRead(convId).catch(() => {});
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
          );
        }
      } catch (err) {
        if (currentReqId !== activeRequestIdRef.current) return;
        toast.error("Could not load messages", { description: err.message });
        setMessages([]);
      } finally {
        if (currentReqId === activeRequestIdRef.current) {
          setLoadingMessages(false);
          scrollToBottom();
        }
      }
    },
    [conversations]
  );

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    } else {
      setMessages([]);
      setLoadingMessages(false);
    }
  }, [activeConversationId, loadMessages]);

  // Re-join conversation room on socket connection / reconnection
  useEffect(() => {
    if (!socket || !activeConversationId) return;

    const handleSocketReconnect = () => {
      socket.emit("chat:join_conversation", activeConversationId);
      loadMessages(activeConversationId, true);
    };

    if (socket.connected) {
      socket.emit("chat:join_conversation", activeConversationId);
    }

    socket.on("connect", handleSocketReconnect);

    return () => {
      socket.off("connect", handleSocketReconnect);
      if (socket.connected) {
        socket.emit("chat:leave_conversation", activeConversationId);
      }
    };
  }, [socket, activeConversationId, loadMessages]);

  // Mark conversation read when window focus or tab visibility changes
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible" && activeConversationId && socket) {
        socket.emit("chat:mark_read", { conversationId: activeConversationId });
        chatApi.markAsRead(activeConversationId).catch(() => {});
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConversationId ? { ...c, unreadCount: 0 } : c))
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [socket, activeConversationId]);

  // 4. Socket Listeners for Realtime Chat
  useEffect(() => {
    if (!socket) return;

    // Receive new message
    const handleNewMessage = (msg) => {
      const senderId = getUserId(msg.sender);
      const myId = getUserId(currentUserId);

      // Recipient delivery receipt: only acknowledge if current user is not sender
      if (senderId && senderId !== myId) {
        socket.emit("chat:message_delivered", {
          conversationId: msg.conversationId,
          messageId: msg.id || msg._id,
        });
      }

      if (msg.conversationId === activeConversationId) {
        setMessages((prev) => {
          const msgKey = (msg.clientMessageId || msg.id || msg._id || "").toString();
          if (
            prev.some(
              (m) => (m.clientMessageId || m.id || m._id || "").toString() === msgKey
            )
          ) {
            return prev;
          }
          return [...prev, msg];
        });
        scrollToBottom();

        // Mark as read ONLY if recipient's tab is genuinely visible
        if (senderId && senderId !== myId && document.visibilityState === "visible") {
          socket.emit("chat:mark_read", { conversationId: activeConversationId });
          chatApi.markAsRead(activeConversationId).catch(() => {});
        }
      }

      // Update conversation in sidebar list
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === msg.conversationId);
        if (index === -1) {
          fetchConversations();
          return prev;
        }
        const updated = [...prev];
        const conv = { ...updated[index] };
        conv.lastMessage = {
          text: msg.text,
          sender: msg.sender,
          createdAt: msg.createdAt,
        };
        conv.lastActivityAt = msg.createdAt;
        if (msg.conversationId !== activeConversationId && senderId !== myId) {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
        }
        updated.splice(index, 1);
        return [conv, ...updated];
      });
    };

    // User typing indicator
    const handleUserTyping = ({ conversationId, userId, userName, isTyping }) => {
      if (conversationId !== activeConversationId) return;
      if (getUserId(userId) === getUserId(currentUserId)) return;

      setTypingUsers((prev) => {
        const copy = { ...prev };
        if (isTyping) {
          copy[userId] = userName;
        } else {
          delete copy[userId];
        }
        return copy;
      });
    };

    // Delivery receipt
    const handleDeliveryReceipt = ({ conversationId, messageIds, userId, deliveredAt }) => {
      if (conversationId !== activeConversationId) return;

      setMessages((prev) =>
        prev.map((m) => {
          const mId = (m.id || m._id || "").toString();
          const isTarget =
            (messageIds && messageIds.some((id) => id.toString() === mId)) ||
            (!messageIds && getUserId(m.sender) === getUserId(currentUserId));
          if (isTarget) {
            const alreadyDelivered = (m.deliveredTo || []).some(
              (d) => getUserId(d.user || d) === getUserId(userId)
            );
            if (!alreadyDelivered) {
              const deliveredTo = [
                ...(m.deliveredTo || []),
                { user: userId, deliveredAt: new Date(deliveredAt || Date.now()) },
              ];
              return { ...m, deliveredTo };
            }
          }
          return m;
        })
      );
    };

    // Read receipt
    const handleReadReceipt = ({ conversationId, userId, readAt }) => {
      if (conversationId !== activeConversationId) return;

      setMessages((prev) =>
        prev.map((m) => {
          const alreadyRead = (m.readBy || []).some(
            (r) => getUserId(r.user || r) === getUserId(userId)
          );
          if (!alreadyRead) {
            const readBy = [
              ...(m.readBy || []),
              { user: userId, readAt: new Date(readAt || Date.now()) },
            ];
            return { ...m, readBy };
          }
          return m;
        })
      );
    };

    // New conversation created
    const handleConversationCreated = () => {
      fetchConversations();
    };

    socket.on("chat:new_message", handleNewMessage);
    socket.on("chat:user_typing", handleUserTyping);
    socket.on("chat:delivery_receipt", handleDeliveryReceipt);
    socket.on("chat:read_receipt", handleReadReceipt);
    socket.on("chat:conversation_created", handleConversationCreated);

    return () => {
      socket.off("chat:new_message", handleNewMessage);
      socket.off("chat:user_typing", handleUserTyping);
      socket.off("chat:delivery_receipt", handleDeliveryReceipt);
      socket.off("chat:read_receipt", handleReadReceipt);
      socket.off("chat:conversation_created", handleConversationCreated);
    };
  }, [socket, activeConversationId, currentUserId]);

  // 5. Load Older Messages
  const handleLoadMore = async () => {
    if (!messages.length || loadingMore || !hasMoreMessages) return;
    setLoadingMore(true);

    const oldestMessage = messages[0];
    try {
      const res = await chatApi.getMessages(activeConversationId, {
        limit: 50,
        before: oldestMessage.createdAt,
      });

      if (res.messages && res.messages.length > 0) {
        setMessages((prev) => [...res.messages, ...prev]);
        setHasMoreMessages(res.hasMore || false);
      } else {
        setHasMoreMessages(false);
      }
    } catch {
      toast.error("Failed to load older messages");
    } finally {
      setLoadingMore(false);
    }
  };

  // 6. Typing trigger
  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessageText(val);

    if (socket && activeConversationId) {
      socket.emit("chat:typing", {
        conversationId: activeConversationId,
        isTyping: val.trim().length > 0,
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("chat:typing", {
          conversationId: activeConversationId,
          isTyping: false,
        });
      }, 3000);
    }
  };

  // 7. Send Message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const text = messageText.trim();
    if (!text || sending || !activeConversationId) return;

    setSending(true);

    // Clear typing status
    if (socket && activeConversationId) {
      socket.emit("chat:typing", {
        conversationId: activeConversationId,
        isTyping: false,
      });
    }

    try {
      if (socket && socket.connected) {
        // Send via Socket.IO with acknowledgment
        socket.emit(
          "chat:send_message",
          { conversationId: activeConversationId, text },
          (res) => {
            setSending(false);
            if (res?.error) {
              toast.error("Message not sent", { description: res.error });
            } else if (res?.success) {
              setMessageText("");
              scrollToBottom();
            }
          }
        );
      } else {
        // Fallback to REST endpoint
        const res = await chatApi.sendMessage(activeConversationId, { text });
        setSending(false);
        setMessageText("");
        setMessages((prev) => [...prev, res.message]);
        scrollToBottom();
      }
    } catch (err) {
      setSending(false);
      toast.error("Failed to send message", { description: err.message });
    }
  };

  // Keydown handler: Enter sends, Shift+Enter new line
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 8. Start Direct Conversation
  const handleStartDirectChat = async (recipientId) => {
    try {
      const res = await chatApi.getOrCreateDirect(recipientId);
      if (res.conversation) {
        setDirectModalOpen(false);
        setSearchParams({ conv: res.conversation.id });
        setActiveConversationId(res.conversation.id);
        await fetchConversations(res.conversation.id);
      }
    } catch (err) {
      toast.error("Could not start direct conversation", { description: err.message });
    }
  };

  // 9. Start Group Conversation
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    if (selectedGroupTeammates.length === 0) {
      toast.error("Please select at least one teammate");
      return;
    }

    try {
      const res = await chatApi.createGroup({
        name: groupName.trim(),
        participantIds: selectedGroupTeammates,
      });
      if (res.conversation) {
        setGroupModalOpen(false);
        setGroupName("");
        setSelectedGroupTeammates([]);
        setSearchParams({ conv: res.conversation.id });
        setActiveConversationId(res.conversation.id);
        await fetchConversations(res.conversation.id);
        toast.success(`Group "${res.conversation.name}" created!`);
      }
    } catch (err) {
      toast.error("Failed to create group", { description: err.message });
    }
  };

  // 10. Toggle Email Notifications Preference
  const handleToggleEmailNotifications = async () => {
    if (!activeConversation) return;
    const newPref = !activeConversation.emailNotifications;

    try {
      await chatApi.updatePreferences({
        conversationId: activeConversation.id,
        emailNotifications: newPref,
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id ? { ...c, emailNotifications: newPref } : c
        )
      );
      toast.success(
        newPref
          ? "Email notifications enabled for this chat"
          : "Email notifications muted for this chat"
      );
    } catch {
      toast.error("Failed to update notification settings");
    }
  };

  // Helpers for conversation metadata
  const getConversationTitle = (conv) => {
    if (conv.type === "group") {
      return conv.name || "Group Chat";
    }
    const otherUser = conv.participants?.find((p) => (p._id || p.id) !== currentUserId);
    return otherUser ? otherUser.name : "Direct Chat";
  };

  const getConversationSubtitle = (conv) => {
    if (conv.type === "group") {
      return `${conv.participants?.length || 0} members`;
    }
    const otherUser = conv.participants?.find((p) => (p._id || p.id) !== currentUserId);
    const memberTag = otherUser?.memberId ? `[${otherUser.memberId}] ` : "";
    return `${memberTag}${otherUser?.jobTitle || otherUser?.email || "Teammate"}`;
  };

  const isOtherUserOnline = (conv) => {
    if (conv.type === "group") return false;
    const otherUser = conv.participants?.find((p) => (p._id || p.id) !== currentUserId);
    const otherId = otherUser?._id || otherUser?.id;
    return otherId ? onlineUserIds.includes(otherId.toString()) : false;
  };

  // Filtered conversation list
  const filteredConversations = useMemo(() => {
    if (!filterQuery.trim()) return conversations;
    const q = filterQuery.toLowerCase();
    return conversations.filter((c) => {
      const title = getConversationTitle(c).toLowerCase();
      const lastMsg = c.lastMessage?.text?.toLowerCase() || "";
      const otherUser = c.participants?.find((p) => (p._id || p.id) !== currentUserId);
      const memberIdMatch = otherUser?.memberId?.toLowerCase().includes(q);
      return title.includes(q) || lastMsg.includes(q) || Boolean(memberIdMatch);
    });
  }, [conversations, filterQuery, currentUserId]);

  // Teammates available for direct chat (excluding self)
  const eligibleTeammates = useMemo(() => {
    return teammates.filter((t) => !t.isCurrentUser);
  }, [teammates]);

  const filteredTeammates = useMemo(() => {
    if (!teammateSearch.trim()) return eligibleTeammates;
    const q = teammateSearch.toLowerCase();
    return eligibleTeammates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.memberId && t.memberId.toLowerCase().includes(q))
    );
  }, [eligibleTeammates, teammateSearch]);

  const typingString = useMemo(() => {
    const names = Object.values(typingUsers);
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} is typing...`;
    return `${names.slice(0, 2).join(", ")} and others are typing...`;
  }, [typingUsers]);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      {/* ── Left Column: Conversation Sidebar ─────────────────────── */}
      <div className="flex w-80 flex-col border-r border-line bg-surface-muted/40 md:w-96">
        {/* Header & New Chat Actions */}
        <div className="border-b border-line p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <MessageSquare className="h-4 w-4" />
              </div>
              <h1 className="font-display text-base font-bold text-ink">Team Chat</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTeammateSearch("");
                  setDirectModalOpen(true);
                }}
                className="h-8 gap-1.5 px-2.5 text-xs font-semibold"
                title="New Direct Message"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Direct
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTeammateSearch("");
                  setGroupName("");
                  setSelectedGroupTeammates([]);
                  setGroupModalOpen(true);
                }}
                className="h-8 gap-1.5 px-2.5 text-xs font-semibold"
                title="New Group Chat"
              >
                <Users className="h-3.5 w-3.5" />
                Group
              </Button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-ink-muted" />
            <Input
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search conversations..."
              className="h-8 pl-8 text-xs bg-surface"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-line/60">
          {loadingConversations ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-ink-muted">
              <Spinner size="sm" />
              <span className="text-xs">Loading conversations...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-ink-muted">
              <MessageSquare className="mb-2 h-8 w-8 text-ink-muted/50" />
              <p className="text-xs font-medium">No conversations yet</p>
              <p className="mt-1 text-[11px]">
                Click "+ Direct" above to message a teammate in {activeOrg?.name || "your workspace"}.
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === activeConversationId;
              const online = isOtherUserOnline(conv);
              const title = getConversationTitle(conv);
              const subtitle = getConversationSubtitle(conv);

              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    setSearchParams({ conv: conv.id });
                    setActiveConversationId(conv.id);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 p-3.5 text-left transition hover:bg-surface-muted",
                    isSelected ? "bg-surface shadow-xs border-l-4 border-brand-600" : ""
                  )}
                >
                  <div className="relative shrink-0">
                    {conv.type === "group" ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs">
                        <Users className="h-5 w-5" />
                      </div>
                    ) : (
                      <Avatar
                        name={title}
                        size="md"
                        className="bg-brand-50 text-brand-700 font-semibold"
                      />
                    )}
                    {conv.type === "direct" && (
                      <span
                        className={cn(
                          "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface",
                          online ? "bg-emerald-500" : "bg-slate-300"
                        )}
                        title={online ? "Online" : "Offline"}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-semibold text-ink">
                        {title}
                      </span>
                      {conv.lastActivityAt && (
                        <span className="shrink-0 text-[10px] text-ink-muted">
                          {new Date(conv.lastActivityAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>

                    <p className="truncate text-[11px] text-ink-soft">
                      {subtitle}
                    </p>

                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-ink-muted">
                        {conv.lastMessage?.text || "No messages yet"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <Badge
                          variant="brand"
                          className="h-4 min-w-[18px] px-1 text-[10px] font-bold shrink-0 bg-brand-600 text-white"
                        >
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right Column: Active Conversation Stream ────────────── */}
      <div className="flex flex-1 flex-col bg-surface">
        {activeConversation ? (
          <>
            {/* Conversation Header */}
            <div className="flex h-16 items-center justify-between border-b border-line px-6 bg-surface">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {activeConversation.type === "group" ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs">
                      <Users className="h-5 w-5" />
                    </div>
                  ) : (
                    <Avatar
                      name={getConversationTitle(activeConversation)}
                      size="md"
                      className="bg-brand-50 text-brand-700 font-semibold"
                    />
                  )}
                  {activeConversation.type === "direct" && (
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface",
                        isOtherUserOnline(activeConversation)
                          ? "bg-emerald-500"
                          : "bg-slate-300"
                      )}
                    />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-ink">
                      {getConversationTitle(activeConversation)}
                    </h2>
                    {activeConversation.type === "group" ? (
                      <Badge variant="outline" className="text-[10px]">
                        Group &bull; {activeConversation.participants?.length || 0} members
                      </Badge>
                    ) : (
                      <>
                        {(() => {
                          const other = activeConversation.participants?.find((p) => (p._id || p.id) !== currentUserId);
                          return other?.memberId ? (
                            <Badge variant="outline" className="font-mono text-[10px] font-bold text-brand-700 bg-brand-50 border-brand-200">
                              {other.memberId}
                            </Badge>
                          ) : null;
                        })()}
                        <span className="text-[11px] text-ink-muted">
                          {isOtherUserOnline(activeConversation) ? (
                            <span className="text-emerald-600 font-medium">Online</span>
                          ) : (
                            "Offline"
                          )}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-ink-soft">
                    {getConversationSubtitle(activeConversation)}
                  </p>
                </div>
              </div>

              {/* Notification Preference Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleEmailNotifications}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
                    activeConversation.emailNotifications
                      ? "border-line bg-surface hover:bg-surface-muted text-ink"
                      : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  )}
                  title={
                    activeConversation.emailNotifications
                      ? "Email alerts enabled for unread messages"
                      : "Email alerts muted for this conversation"
                  }
                >
                  {activeConversation.emailNotifications ? (
                    <>
                      <Bell className="h-3.5 w-3.5 text-brand-600" />
                      <span>Email Alerts On</span>
                    </>
                  ) : (
                    <>
                      <BellOff className="h-3.5 w-3.5 text-amber-600" />
                      <span>Muted</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Message Stream */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-canvas/30"
            >
              {hasMoreMessages && (
                <div className="flex justify-center pb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="h-7 text-xs text-ink-muted hover:text-ink"
                  >
                    {loadingMore ? <Spinner size="sm" /> : "Load earlier messages"}
                  </Button>
                </div>
              )}

              {loadingMessages ? (
                <div className="flex h-64 flex-col items-center justify-center gap-2 text-ink-muted">
                  <Spinner size="md" />
                  <span className="text-xs">Loading message history...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-center text-ink-muted">
                  <MessageSquare className="mb-2 h-10 w-10 text-brand-600/30" />
                  <p className="text-sm font-semibold text-ink">Beginning of conversation</p>
                  <p className="mt-1 text-xs text-ink-muted max-w-sm">
                    Say hello to start collaborating with your team in {activeOrg?.name}!
                  </p>
                </div>
              ) : (
                messages.map((m, index) => {
                  const senderId = getUserId(m.sender);
                  const myId = getUserId(currentUserId);
                  const isOwn = senderId === myId;
                  const isGroup = activeConversation?.type === "group";
                  const otherParticipants = (activeConversation?.participants || []).filter(
                    (p) => getUserId(p) !== senderId
                  );
                  const totalOthers = Math.max(otherParticipants.length, 1);

                  // Recipient read and delivery counts MUST NOT count the sender
                  const recipientReads = (m.readBy || []).filter((r) => {
                    const rId = getUserId(r.user || r);
                    return rId && rId !== senderId;
                  });
                  const readCount = recipientReads.length;

                  const recipientDeliveries = (m.deliveredTo || []).filter((d) => {
                    const dId = getUserId(d.user || d);
                    return dId && dId !== senderId;
                  });
                  const deliveredCount = recipientDeliveries.length;

                  const isAllRead = isGroup ? readCount >= totalOthers : readCount > 0;
                  const isPartiallyRead = isGroup && readCount > 0 && readCount < totalOthers;
                  const isDelivered = deliveredCount > 0;

                  return (
                    <div
                      key={m.id || index}
                      className={cn("flex items-end gap-2", isOwn ? "justify-end" : "justify-start")}
                    >
                      {!isOwn && (
                        <Avatar
                          name={m.sender?.name || "Teammate"}
                          size="sm"
                          className="bg-brand-100 text-brand-800 text-[10px] shrink-0 mb-1"
                        />
                      )}

                      <div
                        className={cn(
                          "max-w-lg rounded-2xl px-4 py-2.5 text-xs shadow-xs",
                          isOwn
                            ? "bg-brand-600 text-white rounded-br-xs"
                            : "bg-surface border border-line text-ink rounded-bl-xs"
                        )}
                      >
                        {!isOwn && activeConversation?.type === "group" && (
                          <p className="mb-1 text-[10px] font-bold text-brand-700">
                            {m.sender?.name || "Teammate"}
                          </p>
                        )}

                        <p className="whitespace-pre-wrap break-words leading-relaxed text-[13px]">
                          {m.text}
                        </p>

                        <div
                          className={cn(
                            "mt-1 flex items-center justify-end gap-1.5 text-[10px]",
                            isOwn ? "text-brand-100" : "text-ink-muted"
                          )}
                        >
                          <span>
                            {m.createdAt
                              ? new Date(m.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                          {isOwn && (
                            <div className="flex items-center gap-0.5">
                              {isAllRead ? (
                                <span
                                  title={isGroup ? `Read by all (${readCount}/${totalOthers})` : "Read"}
                                  aria-label="Read"
                                  className="flex items-center"
                                >
                                  <CheckCheck className="h-3.5 w-3.5 text-sky-400" />
                                  {isGroup && totalOthers > 1 && (
                                    <span className="text-[9px] text-sky-300 ml-0.5">({readCount})</span>
                                  )}
                                </span>
                              ) : isPartiallyRead ? (
                                <span
                                  title={`Read by ${readCount} of ${totalOthers}`}
                                  aria-label={`Read by ${readCount} of ${totalOthers}`}
                                  className="flex items-center"
                                >
                                  <CheckCheck className="h-3.5 w-3.5 text-sky-400/80" />
                                  <span className="text-[9px] text-sky-200 ml-0.5">({readCount})</span>
                                </span>
                              ) : isDelivered ? (
                                <span
                                  title={isGroup ? `Delivered to ${deliveredCount} of ${totalOthers}` : "Delivered"}
                                  aria-label="Delivered"
                                  className="flex items-center"
                                >
                                  <CheckCheck className="h-3.5 w-3.5 text-brand-200" />
                                  {isGroup && totalOthers > 1 && (
                                    <span className="text-[9px] text-brand-200 ml-0.5">({deliveredCount})</span>
                                  )}
                                </span>
                              ) : (
                                <span title="Sent" aria-label="Sent" className="flex items-center">
                                  <Check className="h-3.5 w-3.5 text-brand-200" />
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {typingString && (
                <div className="flex items-center gap-2 text-xs text-brand-600 italic animate-pulse px-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-600" />
                  <span>{typingString}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer */}
            <div className="border-t border-line p-4 bg-surface">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <textarea
                  value={messageText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                  rows={2}
                  className="flex-1 resize-none rounded-xl border border-line bg-surface p-3 text-xs text-ink placeholder:text-ink-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <Button
                  type="submit"
                  disabled={!messageText.trim() || sending}
                  className="h-10 px-4 bg-brand-600 text-white hover:bg-brand-700 rounded-xl font-medium gap-1.5"
                >
                  {sending ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
                  <span>Send</span>
                </Button>
              </form>
              <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-ink-muted">
                <span>Press Enter to send, Shift + Enter for new line</span>
                <span>Protected by workspace tenant encryption</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-ink-muted">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h2 className="font-display text-lg font-bold text-ink">Select a conversation</h2>
            <p className="mt-1 max-w-sm text-xs text-ink-soft">
              Choose an existing chat from the left panel or start a new direct message with a teammate.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDirectModalOpen(true)}
                className="gap-1.5"
              >
                <UserPlus className="h-4 w-4" />
                Start Direct Message
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGroupModalOpen(true)}
                className="gap-1.5"
              >
                <Users className="h-4 w-4" />
                Create Group Chat
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Direct Message Modal ──────────────────────────────────── */}
      <Dialog
        open={directModalOpen}
        onClose={() => setDirectModalOpen(false)}
        title="Start Direct Message"
        description={`Choose a teammate in ${activeOrg?.name || "your workspace"} to start messaging.`}
      >
        <div className="space-y-4 pt-2">
          <Input
            value={teammateSearch}
            onChange={(e) => setTeammateSearch(e.target.value)}
            placeholder="Search teammate by name or email..."
            className="text-xs"
          />

          <div className="max-h-64 overflow-y-auto divide-y divide-line rounded-lg border border-line">
            {filteredTeammates.length === 0 ? (
              <p className="p-4 text-center text-xs text-ink-muted">
                No teammates found matching your query.
              </p>
            ) : (
              filteredTeammates.map((t) => {
                const online = onlineUserIds.includes(t.id?.toString());
                return (
                  <button
                    key={t.id}
                    onClick={() => handleStartDirectChat(t.id)}
                    className="flex w-full items-center justify-between p-3 text-left transition hover:bg-surface-muted"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar name={t.name} size="sm" className="bg-brand-50 text-brand-700" />
                        <span
                          className={cn(
                            "absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-surface",
                            online ? "bg-emerald-500" : "bg-slate-300"
                          )}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-ink">{t.name}</p>
                          {t.memberId && (
                            <Badge variant="outline" className="font-mono text-[9px] px-1 py-0 text-brand-700 bg-brand-50 border-brand-200">
                              {t.memberId}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-ink-muted">{t.jobTitle || "Teammate"} &bull; {t.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {t.role}
                    </Badge>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </Dialog>

      {/* ── Group Chat Modal ──────────────────────────────────────── */}
      <Dialog
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        title="Create Group Chat"
        description="Select teammates to include in a group conversation."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-ink">Group Name</label>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Enterprise Sales Pipeline"
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink">Select Teammates</label>
            <Input
              value={teammateSearch}
              onChange={(e) => setTeammateSearch(e.target.value)}
              placeholder="Filter teammates by name, email, or member ID..."
              className="mt-1 text-xs mb-2"
            />

            <div className="max-h-56 overflow-y-auto divide-y divide-line rounded-lg border border-line">
              {filteredTeammates.length === 0 ? (
                <p className="p-3 text-center text-xs text-ink-muted">No teammates available.</p>
              ) : (
                filteredTeammates.map((t) => {
                  const isChecked = selectedGroupTeammates.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className="flex cursor-pointer items-center justify-between p-2.5 transition hover:bg-surface-muted"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGroupTeammates((prev) => [...prev, t.id]);
                            } else {
                              setSelectedGroupTeammates((prev) =>
                                prev.filter((id) => id !== t.id)
                              );
                            }
                          }}
                          className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-ink">{t.name}</p>
                            {t.memberId && (
                              <Badge variant="outline" className="font-mono text-[9px] px-1 py-0 text-brand-700 bg-brand-50 border-brand-200">
                                {t.memberId}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-ink-muted">{t.jobTitle || "Teammate"}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {t.role}
                      </Badge>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGroupModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedGroupTeammates.length === 0}
              className="bg-brand-600 text-white"
            >
              Create Group
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
