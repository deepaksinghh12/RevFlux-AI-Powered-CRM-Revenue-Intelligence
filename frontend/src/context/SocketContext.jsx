import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !token) return;

    const url = import.meta.env.VITE_API_URL.replace("/api", "");
    const s = io(url, {
      withCredentials: true,
    });

    s.on("connect", () => {
      s.emit("join", user._id);
    });

    s.on("notification", (data) => {
      toast[data.type || "info"](data.title, {
        description: data.message,
      });
      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((c) => c + 1);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user, token]);

  const clearUnread = () => setUnreadCount(0);

  return (
    <SocketContext.Provider value={{ socket, notifications, unreadCount, clearUnread }}>
      {children}
    </SocketContext.Provider>
  );
}
