import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  MessageSquare,
  X,
  Send,
  Users,
  Minimize2,
  Maximize2,
  Search,
  ArrowLeft,
  UserPlus,
  Check,
  CheckCheck,
} from "lucide-react";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import { chatApi } from "../../lib/services";
import { Avatar, Spinner, Badge } from "../ui";
import { cn } from "../../lib/utils";

const getUserId = (u) => {
  if (!u) return "";
  if (typeof u === "string") return u;
  if (u._id) return u._id.toString();
  if (u.id) return u.id.toString();
  if (typeof u.toString === "function") return u.toString();
  return "";
};

export function TeamChatWidget() {
  const { socket, onlineUserIds } = useSocket();
  const { user, activeOrg } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // "list" | "chat" | "new-chat"
  const [teammates, setTeammates] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typingUsers, setTypingUsers] = useState({});

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const widgetRequestIdRef = useRef(0);

  const currentUserId = getUserId(user);

  // Do not render the floating widget when user is already on the full /chat page
  const isOnChatPage = location.pathname === "/chat";

  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [conversations]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConvId) || null;
  }, [conversations, activeConvId]);

  // 1. Fetch conversations from real API
  const fetchConversations = useCallback(async () => {
    if (!activeOrg?.id) return;
    try {
      setLoadingConversations(true);
      const res = await chatApi.getConversations();
      if (res?.conversations) {
        setConversations(res.conversations);
      }
    } catch (err) {
      console.error("Failed to fetch conversations for widget:", err);
    } finally {
      setLoadingConversations(false);
    }
  }, [activeOrg?.id]);

  useEffect(() => {
    if (activeOrg?.id && !isOnChatPage) {
      fetchConversations();
    }
  }, [activeOrg?.id, isOnChatPage, fetchConversations]);

  // 2. Fetch teammates for starting new chats
  const fetchTeammates = useCallback(async () => {
    if (!activeOrg?.id) return;
    try {
      const res = await chatApi.getTeammates();
      if (res?.teammates) {
        setTeammates(res.teammates);
      }
    } catch (err) {
      console.error("Failed to fetch teammates for widget:", err);
    }
  }, [activeOrg?.id]);

  // 3. Load messages for active conversation
  const loadMessages = useCallback(
    async (convId) => {
      if (!convId) {
        setMessages([]);
        setLoadingMessages(false);
        return;
      }
      const currentReqId = ++widgetRequestIdRef.current;
      try {
        setLoadingMessages(true);
        setTypingUsers({});
        const res = await chatApi.getMessages(convId, { limit: 40 });
        if (currentReqId !== widgetRequestIdRef.current) return;
        setMessages(res?.messages || []);

        // Only mark as read if widget is currently open, in chat view, and tab is visible
        if (isOpen && viewMode === "chat" && document.visibilityState === "visible") {
          chatApi.markAsRead(convId).catch(() => {});
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
          );
        }
      } catch (err) {
        if (currentReqId !== widgetRequestIdRef.current) return;
        console.error("Failed to load messages for widget:", err);
        setMessages([]);
      } finally {
        if (currentReqId === widgetRequestIdRef.current) {
          setLoadingMessages(false);
        }
      }
    },
    [isOpen, viewMode]
  );

  // When activeConvId changes, load messages and join socket room
  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    } else {
      setMessages([]);
      setLoadingMessages(false);
    }
  }, [activeConvId, loadMessages]);

  // Re-join conversation room on socket connection / reconnection
  useEffect(() => {
    if (!socket || !activeConvId) return;

    const handleSocketReconnect = () => {
      socket.emit("chat:join_conversation", activeConvId);
      loadMessages(activeConvId);
    };

    if (socket.connected) {
      socket.emit("chat:join_conversation", activeConvId);
    }

    socket.on("connect", handleSocketReconnect);

    return () => {
      socket.off("connect", handleSocketReconnect);
      if (socket.connected) {
        socket.emit("chat:leave_conversation", activeConvId);
      }
    };
  }, [activeConvId, loadMessages, socket]);

  // Mark conversation read on tab visibility or window focus
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (
        isOpen &&
        viewMode === "chat" &&
        document.visibilityState === "visible" &&
        activeConvId &&
        socket
      ) {
        socket.emit("chat:mark_read", { conversationId: activeConvId });
        chatApi.markAsRead(activeConvId).catch(() => {});
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConvId ? { ...c, unreadCount: 0 } : c))
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [isOpen, viewMode, activeConvId, socket]);

  // Auto-scroll messages
  useEffect(() => {
    if (viewMode === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, viewMode]);

  // 4. Socket.IO Event Listeners
  useEffect(() => {
    if (!socket || isOnChatPage) return;

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

      if (msg.conversationId === activeConvId) {
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
        if (
          isOpen &&
          viewMode === "chat" &&
          senderId !== myId &&
          document.visibilityState === "visible"
        ) {
          socket.emit("chat:mark_read", { conversationId: activeConvId });
          chatApi.markAsRead(activeConvId).catch(() => {});
        }
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === msg.conversationId
              ? {
                  ...c,
                  unreadCount: (c.unreadCount || 0) + 1,
                  lastMessage: {
                    text: msg.text,
                    sender: msg.sender?._id || msg.sender,
                    createdAt: msg.createdAt,
                  },
                  lastActivityAt: msg.createdAt,
                }
              : c
          )
        );
      }
    };

    const handleUserTyping = ({ conversationId, userId, userName, isTyping }) => {
      if (conversationId !== activeConvId || getUserId(userId) === getUserId(currentUserId)) return;
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (isTyping) next[userId] = userName;
        else delete next[userId];
        return next;
      });
    };

    const handleDeliveryReceipt = ({ conversationId, messageIds, userId, deliveredAt }) => {
      if (conversationId !== activeConvId) return;
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

    const handleReadReceipt = ({ conversationId, userId, readAt }) => {
      if (conversationId !== activeConvId) return;
      setMessages((prev) =>
        prev.map((m) => {
          const alreadyRead = (m.readBy || []).some(
            (r) => getUserId(r.user || r) === getUserId(userId)
          );
          if (!alreadyRead) {
            return {
              ...m,
              readBy: [...(m.readBy || []), { user: userId, readAt: new Date(readAt || Date.now()) }],
            };
          }
          return m;
        })
      );
    };

    const handleConversationUpdated = () => {
      fetchConversations();
    };

    socket.on("chat:new_message", handleNewMessage);
    socket.on("chat:user_typing", handleUserTyping);
    socket.on("chat:delivery_receipt", handleDeliveryReceipt);
    socket.on("chat:read_receipt", handleReadReceipt);
    socket.on("chat:conversation_updated", handleConversationUpdated);
    socket.on("chat:conversation_created", handleConversationUpdated);

    return () => {
      socket.off("chat:new_message", handleNewMessage);
      socket.off("chat:user_typing", handleUserTyping);
      socket.off("chat:delivery_receipt", handleDeliveryReceipt);
      socket.off("chat:read_receipt", handleReadReceipt);
      socket.off("chat:conversation_updated", handleConversationUpdated);
      socket.off("chat:conversation_created", handleConversationUpdated);
    };
  }, [socket, activeConvId, currentUserId, isOpen, viewMode, isOnChatPage, fetchConversations]);

  // 5. Send Message Action
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !activeConvId || sending) return;

    setSending(true);
    setInputText("");

    // Emit stop typing
    if (socket && activeConvId) {
      socket.emit("chat:typing", { conversationId: activeConvId, isTyping: false });
    }

    const clientMessageId = `widget-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Try sending via Socket.IO first with callback acknowledgement
    if (socket && socket.connected) {
      socket.emit(
        "chat:send_message",
        { conversationId: activeConvId, text, clientMessageId },
        (res) => {
          setSending(false);
          if (res?.error) {
            // Fallback to REST
            chatApi.sendMessage(activeConvId, { text, clientMessageId }).catch(() => {});
          }
        }
      );
    } else {
      try {
        await chatApi.sendMessage(activeConvId, { text, clientMessageId });
      } catch (err) {
        console.error("Widget failed to send message via REST:", err);
      } finally {
        setSending(false);
      }
    }
  };

  // 6. Typing Indicator Trigger
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    if (socket && activeConvId) {
      socket.emit("chat:typing", {
        conversationId: activeConvId,
        isTyping: val.trim().length > 0,
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("chat:typing", {
          conversationId: activeConvId,
          isTyping: false,
        });
      }, 2500);
    }
  };

  // 7. Start Direct Chat from Teammate Picker
  const handleStartDirectChat = async (recipientId) => {
    try {
      const res = await chatApi.getOrCreateDirect(recipientId);
      if (res?.conversation) {
        await fetchConversations();
        setActiveConvId(res.conversation.id);
        setViewMode("chat");
      }
    } catch (err) {
      console.error("Failed to start direct chat:", err);
    }
  };

  // 8. Open Full Chat Page in Main App
  const handleExpandToFullChat = (convId = null) => {
    setIsOpen(false);
    const target = convId || activeConvId;
    if (target) {
      navigate(`/chat?conv=${target}`);
    } else {
      navigate("/chat");
    }
  };

  // Filtered lists
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => {
      const isGroup = c.type === "group";
      const otherUser = c.participants?.find((p) => (p._id || p.id) !== currentUserId);
      const title = isGroup ? c.name : otherUser?.name || "";
      const memberId = otherUser?.memberId || "";
      const lastText = c.lastMessage?.text || "";
      return (
        title.toLowerCase().includes(q) ||
        memberId.toLowerCase().includes(q) ||
        lastText.toLowerCase().includes(q)
      );
    });
  }, [conversations, searchQuery, currentUserId]);

  const filteredTeammates = useMemo(() => {
    const eligible = teammates.filter((t) => (t.id || t._id).toString() !== currentUserId);
    if (!searchQuery.trim()) return eligible;
    const q = searchQuery.toLowerCase();
    return eligible.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.memberId?.toLowerCase().includes(q)
    );
  }, [teammates, searchQuery, currentUserId]);

  if (!user || isOnChatPage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* ── Chat Popover Window ────────────────────────────────────────── */}
      {isOpen ? (
        <div className="flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl animate-fade-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line bg-surface-muted px-4 py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {viewMode !== "list" ? (
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("list");
                    setSearchQuery("");
                  }}
                  className="rounded-lg p-1 text-ink-soft hover:bg-surface hover:text-ink transition"
                  title="Back to conversation list"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <MessageSquare className="h-4 w-4" />
                </div>
              )}

              <div className="min-w-0">
                {viewMode === "chat" && activeConversation ? (
                  <div>
                    <div className="flex items-center gap-1.5 truncate">
                      <h4 className="text-xs font-bold text-ink truncate">
                        {activeConversation.type === "group"
                          ? activeConversation.name || "Group Chat"
                          : activeConversation.participants?.find((p) => (p._id || p.id) !== currentUserId)?.name || "Direct Chat"}
                      </h4>
                      {(() => {
                        const other = activeConversation.participants?.find((p) => (p._id || p.id) !== currentUserId);
                        return other?.memberId ? (
                          <Badge variant="outline" className="font-mono text-[9px] px-1 py-0 text-brand-700 bg-brand-50 border-brand-200">
                            {other.memberId}
                          </Badge>
                        ) : null;
                      })()}
                    </div>
                    <p className="text-[10px] text-ink-soft">
                      {activeConversation.type === "group"
                        ? `${activeConversation.participants?.length || 0} members`
                        : "Active conversation"}
                    </p>
                  </div>
                ) : viewMode === "new-chat" ? (
                  <div>
                    <h4 className="text-xs font-bold text-ink">New Direct Chat</h4>
                    <p className="text-[10px] text-ink-soft">Select a teammate</p>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-xs font-bold text-ink">Team Chat</h4>
                    <p className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {activeOrg?.name || "Workspace"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleExpandToFullChat()}
                className="rounded-lg p-1.5 text-ink-soft hover:bg-surface hover:text-ink transition"
                title="Expand to full Chat page"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-ink-soft hover:bg-surface hover:text-ink transition"
                title="Minimize chat"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── View: Conversation List ─────────────────────────────────── */}
          {viewMode === "list" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Search & New Chat Action */}
              <div className="p-3 border-b border-line flex items-center gap-2 bg-surface">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-soft" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, ID, or text..."
                    className="w-full rounded-xl border border-line bg-canvas pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-ink-soft focus:border-brand-500 focus:outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("new-chat");
                    setSearchQuery("");
                    fetchTeammates();
                  }}
                  className="flex h-8 items-center gap-1 rounded-xl bg-brand-600 px-2.5 text-xs font-semibold text-white transition hover:bg-brand-700 shrink-0"
                  title="Start a new direct message"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>New</span>
                </button>
              </div>

              {/* Conversation items */}
              <div className="flex-1 overflow-y-auto divide-y divide-line/60">
                {loadingConversations ? (
                  <div className="flex h-36 flex-col items-center justify-center gap-2 text-ink-soft">
                    <Spinner size="sm" />
                    <span className="text-xs">Loading conversations...</span>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="flex h-44 flex-col items-center justify-center p-6 text-center text-ink-soft">
                    <MessageSquare className="h-8 w-8 mb-2 opacity-40 text-brand-600" />
                    <p className="text-xs font-semibold text-ink">No conversations found</p>
                    <p className="text-[11px] text-ink-soft mt-1">
                      Click "+ New" to message a teammate in {activeOrg?.name}.
                    </p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const isGroup = conv.type === "group";
                    const otherUser = conv.participants?.find((p) => (p._id || p.id) !== currentUserId);
                    const title = isGroup ? conv.name || "Group Chat" : otherUser?.name || "Teammate";
                    const isOnline = otherUser?._id && onlineUserIds.includes(otherUser._id.toString());

                    return (
                      <button
                        key={conv.id}
                        type="button"
                        onClick={() => {
                          setActiveConvId(conv.id);
                          setViewMode("chat");
                        }}
                        className="flex w-full items-start gap-3 p-3 text-left transition hover:bg-surface-muted"
                      >
                        <div className="relative shrink-0">
                          {isGroup ? (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                              <Users className="h-4 w-4" />
                            </div>
                          ) : (
                            <Avatar name={title} size="sm" className="bg-brand-50 text-brand-700 font-semibold" />
                          )}
                          {!isGroup && (
                            <span
                              className={cn(
                                "absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-surface",
                                isOnline ? "bg-emerald-500" : "bg-slate-300"
                              )}
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="truncate text-xs font-semibold text-ink">{title}</span>
                              {otherUser?.memberId && (
                                <Badge variant="outline" className="font-mono text-[8px] px-1 py-0 text-brand-700 bg-brand-50 border-brand-200">
                                  {otherUser.memberId}
                                </Badge>
                              )}
                            </div>
                            {conv.lastActivityAt && (
                              <span className="shrink-0 text-[10px] text-ink-soft">
                                {new Date(conv.lastActivityAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className="truncate text-xs text-ink-soft">
                              {conv.lastMessage?.text || "No messages yet"}
                            </p>
                            {conv.unreadCount > 0 && (
                              <Badge className="h-4 min-w-[16px] px-1 text-[9px] font-bold bg-brand-600 text-white shrink-0">
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
          )}

          {/* ── View: New Chat Teammate Picker ───────────────────────────── */}
          {viewMode === "new-chat" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="p-3 border-b border-line bg-surface">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-soft" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search teammate by name, email, or ID..."
                    className="w-full rounded-xl border border-line bg-canvas pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-ink-soft focus:border-brand-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-line/60">
                {filteredTeammates.length === 0 ? (
                  <p className="p-4 text-center text-xs text-ink-soft">No active teammates found.</p>
                ) : (
                  filteredTeammates.map((t) => {
                    const isOnline = onlineUserIds.includes((t.id || t._id).toString());
                    return (
                      <button
                        key={t.id || t._id}
                        type="button"
                        onClick={() => handleStartDirectChat(t.id || t._id)}
                        className="flex w-full items-center justify-between p-3 text-left transition hover:bg-surface-muted"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <Avatar name={t.name} size="sm" className="bg-brand-50 text-brand-700" />
                            <span
                              className={cn(
                                "absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-surface",
                                isOnline ? "bg-emerald-500" : "bg-slate-300"
                              )}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-xs font-semibold text-ink truncate">{t.name}</span>
                              {t.memberId && (
                                <Badge variant="outline" className="font-mono text-[9px] px-1 py-0 text-brand-700 bg-brand-50 border-brand-200">
                                  {t.memberId}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-ink-soft truncate">{t.jobTitle || t.role} &bull; {t.email}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[9px] uppercase font-semibold">
                          {t.role}
                        </Badge>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ── View: Active Conversation Chat Thread ────────────────────── */}
          {viewMode === "chat" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-canvas/30">
                {loadingMessages ? (
                  <div className="flex h-36 flex-col items-center justify-center gap-2 text-ink-soft">
                    <Spinner size="sm" />
                    <span className="text-xs">Loading messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center p-4 text-center text-ink-soft">
                    <p className="text-xs font-medium">No messages yet.</p>
                    <p className="text-[11px] mt-0.5">Send a message to begin the conversation.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const senderId = getUserId(m.sender);
                    const myId = getUserId(currentUserId);
                    const isMe = senderId === myId;
                    const isGroup = activeConversation?.type === "group";
                    const otherParticipants = (activeConversation?.participants || []).filter(
                      (p) => getUserId(p) !== senderId
                    );
                    const totalOthers = Math.max(otherParticipants.length, 1);

                    // Recipient read & delivery counts MUST NOT count sender
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
                        key={m.id || m._id}
                        className={cn("flex flex-col max-w-[85%]", isMe ? "ml-auto items-end" : "items-start")}
                      >
                        {!isMe && (
                          <span className="mb-0.5 text-[10px] font-semibold text-ink-soft px-1">
                            {m.sender?.name || "Teammate"}
                          </span>
                        )}
                        <div
                          className={cn(
                            "rounded-2xl px-3 py-1.5 text-xs font-medium leading-relaxed shadow-xs break-words",
                            isMe
                              ? "bg-brand-600 text-white rounded-br-none"
                              : "bg-surface text-ink border border-line rounded-bl-none"
                          )}
                        >
                          {m.text}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[9px] text-ink-soft px-1">
                          <span>
                            {m.createdAt
                              ? new Date(m.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                          {isMe && (
                            <div className="flex items-center gap-0.5">
                              {isAllRead ? (
                                <span
                                  title={isGroup ? `Read by all (${readCount}/${totalOthers})` : "Read"}
                                  aria-label="Read"
                                  className="flex items-center"
                                >
                                  <CheckCheck className="h-3 w-3 text-sky-400" />
                                  {isGroup && totalOthers > 1 && (
                                    <span className="text-[8px] text-sky-300 ml-0.5">({readCount})</span>
                                  )}
                                </span>
                              ) : isPartiallyRead ? (
                                <span
                                  title={`Read by ${readCount} of ${totalOthers}`}
                                  aria-label={`Read by ${readCount} of ${totalOthers}`}
                                  className="flex items-center"
                                >
                                  <CheckCheck className="h-3 w-3 text-sky-400/80" />
                                  <span className="text-[8px] text-sky-200 ml-0.5">({readCount})</span>
                                </span>
                              ) : isDelivered ? (
                                <span
                                  title={isGroup ? `Delivered to ${deliveredCount} of ${totalOthers}` : "Delivered"}
                                  aria-label="Delivered"
                                  className="flex items-center"
                                >
                                  <CheckCheck className="h-3 w-3 text-brand-200" />
                                  {isGroup && totalOthers > 1 && (
                                    <span className="text-[8px] text-brand-200 ml-0.5">({deliveredCount})</span>
                                  )}
                                </span>
                              ) : (
                                <span title="Sent" aria-label="Sent" className="flex items-center">
                                  <Check className="h-3 w-3 text-brand-200" />
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing indicator */}
              {Object.keys(typingUsers).length > 0 && (
                <div className="px-3.5 py-1 text-[10px] text-ink-soft italic bg-surface-muted/50 border-t border-line/40">
                  {Object.values(typingUsers).join(", ")} is typing...
                </div>
              )}

              {/* Message Composer */}
              <form onSubmit={handleSendMessage} className="border-t border-line p-2.5 bg-surface">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="Type a message..."
                    className="flex-1 rounded-xl border border-line bg-canvas px-3 py-1.5 text-xs text-ink placeholder:text-ink-soft focus:border-brand-500 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    {sending ? <Spinner size="xs" /> : <Send className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      ) : (
        /* ── Floating Launcher Button ──────────────────────────────────── */
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            fetchConversations();
          }}
          className="relative flex h-13 w-13 items-center justify-center rounded-full bg-brand-600 text-white shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          title="Open Team Chat"
        >
          <MessageSquare className="h-6 w-6" />
          {totalUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-surface">
              {totalUnreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
