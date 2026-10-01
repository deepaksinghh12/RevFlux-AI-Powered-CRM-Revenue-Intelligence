import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Users, Minimize2 } from "lucide-react";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";

export function TeamChatWidget() {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "1",
      senderName: "RevFlux Bot",
      senderAvatar: "🤖",
      text: "Welcome to the Team Live Chat room! Send a message to communicate with other online operators.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (!isOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    socket.on("team:new_message", handleNewMessage);

    return () => {
      socket.off("team:new_message", handleNewMessage);
    };
  }, [socket, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;

    const avatar = localStorage.getItem("revflux_avatar") || user?.name?.charAt(0) || "U";
    
    socket.emit("team:send_message", {
      senderId: user?._id || user?.id,
      senderName: user?.name || "Operator",
      senderAvatar: avatar,
      text: inputText.trim(),
    });

    setInputText("");
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Chat Popover Window */}
      {isOpen ? (
        <div className="flex h-[450px] w-[350px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)] animate-fade-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line bg-surface-muted px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-ink">Operator Live Chat</h4>
                <p className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Realtime Team Room
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-ink-soft transition hover:bg-surface hover:text-ink"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => {
              const isMe = msg.senderId === (user?._id || user?.id);
              return (
                <div
                  key={msg.id}
                  className={cn("flex flex-col max-w-[85%]", isMe ? "ml-auto items-end" : "items-start")}
                >
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] text-ink-soft">
                    <span className="font-semibold text-ink">{msg.senderName}</span>
                    <span>•</span>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2 text-xs font-medium leading-relaxed shadow-xs",
                      isMe
                        ? "bg-brand-600 text-white rounded-br-none"
                        : "bg-surface-muted text-ink border border-line/60 rounded-bl-none"
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="border-t border-line p-3 bg-surface">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Type a team message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 rounded-xl border border-line bg-canvas px-3 py-2 text-xs text-ink placeholder:text-ink-soft focus:border-brand-500 focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Floating Trigger Button */
        <button
          onClick={() => setIsOpen(true)}
          className="relative flex h-13 w-13 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <MessageSquare className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-surface">
              {unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
