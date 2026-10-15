import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const { user, refreshSession } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
    const url = apiUrl.replace("/api", "");
    const s = io(url, {
      withCredentials: true,
    });

    s.on("connect", () => {
      const userId = user._id || user.id;
      if (userId) {
        s.emit("join", userId.toString());
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
    s.on("permissions:updated", (data) => {
      toast.info("Permissions Updated", {
        description: "Your workspace role or permissions were updated by an administrator.",
      });
      if (typeof refreshSession === "function") {
        refreshSession();
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user, refreshSession]);

  const clearUnread = () => setUnreadCount(0);

  return (
    <SocketContext.Provider value={{ socket, notifications, unreadCount, clearUnread }}>
      {children}
    </SocketContext.Provider>
  );
}
