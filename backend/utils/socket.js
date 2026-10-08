import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import OrganizationMembership from "../models/OrganizationMembership.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication error: No token provided"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error("Authentication error: User not found"));
      
      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.user.email})`);

    // Client must explicitly join an organization room
    socket.on("join_org", async (orgId) => {
      try {
        const membership = await OrganizationMembership.findOne({
          user: socket.user._id,
          organization: orgId,
          status: "active"
        });

        if (!membership) {
          return socket.emit("error", { message: "Access denied to this organization's room" });
        }

        const roomName = `org_${orgId}`;
        socket.join(roomName);
        socket.join(socket.user._id.toString()); // Personal room for direct notifications
        console.log(`Socket ${socket.id} joined rooms: ${socket.user._id} & ${roomName}`);
      } catch (err) {
        socket.emit("error", { message: "Failed to join organization room" });
      }
    });

    socket.on("team:send_message", async (data) => {
      const orgId = data.organizationId;
      if (!orgId) return;

      // Re-validate membership before allowing broadcast
      const membership = await OrganizationMembership.findOne({
        user: socket.user._id,
        organization: orgId,
        status: "active"
      });

      if (!membership) return;

      const roomName = `org_${orgId}`;
      io.to(roomName).emit("team:new_message", {
        id: Date.now().toString(),
        senderId: socket.user._id.toString(),
        senderName: data.senderName,
        senderAvatar: data.senderAvatar,
        text: data.text,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
