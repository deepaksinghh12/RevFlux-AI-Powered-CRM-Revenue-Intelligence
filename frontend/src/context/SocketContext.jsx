import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { TOKEN_KEY } from "../lib/api";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const { user, activeOrg, refreshSession } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
    const url = apiUrl.replace("/api", "");

    const s = io(url, {
      auth: { token },
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    s.on("connect", () => {
      if (activeOrg?.id) {
        s.emit("join_org", activeOrg.id);
        s.emit("chat:get_online_teammates", activeOrg.id, (res) => {
          if (res?.success && Array.isArray(res.onlineUserIds)) {
            setOnlineUserIds(res.onlineUserIds);
          }
        });
      }
    });

    s.on("notification", (data) => {
      toast[data.type || "info"](data.title, {
        description: data.message,
      });
      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((c) => c + 1);
    });

    // Handle real-time permission or role changes
    s.on("permissions:updated", () => {
      toast.info("Permissions Updated", {
        description: "Your workspace role or permissions were updated by an administrator.",
      });
      if (typeof refreshSession === "function") {
        refreshSession();
      }
    });

    // Handle presence updates
    s.on("chat:presence_update", ({ userId, status }) => {
      setOnlineUserIds((prev) => {
        if (status === "online") {
          return prev.includes(userId) ? prev : [...prev, userId];
        } else {
          return prev.filter((id) => id !== userId);
        }
      });
    });

    // Handle conversation updates
    s.on("chat:conversation_updated", () => {
      // Allow pages to subscribe to this
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user, activeOrg?.id, refreshSession]);

  // When activeOrg changes on an existing connected socket, join the new org room
  useEffect(() => {
    if (socket && socket.connected && activeOrg?.id) {
      socket.emit("join_org", activeOrg.id);
      socket.emit("chat:get_online_teammates", activeOrg.id, (res) => {
        if (res?.success && Array.isArray(res.onlineUserIds)) {
          setOnlineUserIds(res.onlineUserIds);
        }
      });
    }
  }, [socket, activeOrg?.id]);

  const clearUnread = () => setUnreadCount(0);

  return (
    <SocketContext.Provider
      value={{
        socket,
        notifications,
        unreadCount,
        clearUnread,
        chatUnreadCount,
        setChatUnreadCount,
        onlineUserIds,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
