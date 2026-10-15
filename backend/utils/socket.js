import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import OrganizationMembership from "../models/OrganizationMembership.js";

let io;

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

    // Client must explicitly join an organization room
    socket.on("join_org", async (orgId) => {
      try {
        if (!orgId) return;

        const sessionValid = await verifySocketSession();
        if (!sessionValid) return;

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
      } catch (err) {
        socket.emit("error", { message: "Failed to join organization room" });
      }
    });

    socket.on("team:send_message", async (data) => {
      if (!data) return;
      const orgId = data.organizationId;
      if (!orgId) return;

      const sessionValid = await verifySocketSession();
      if (!sessionValid) return;

      // Re-validate membership and status before allowing broadcast
      const membership = await OrganizationMembership.findOne({
        user: socket.user._id,
        organization: orgId,
        status: "active"
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
        // Derive sender name and avatar from the authenticated user, NEVER from client
        senderName: socket.user.name || "Team Member",
        senderAvatar: socket.user.avatar || "",
        text,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => {
      // Clean disconnect
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
 * Called when a membership is suspended.
 */
export const revokeOrgRoomAccess = (userId, orgId) => {
  if (!io) return;
  const targetId = userId.toString();
  const roomName = `org_${orgId}`;
  for (const [, socket] of io.sockets.sockets) {
    if (socket.user && socket.user._id.toString() === targetId) {
      socket.leave(roomName);
      socket.emit("error", { message: "Access to workspace room revoked" });
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
