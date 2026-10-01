import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Clients emit this immediately after connecting to join their personal room
    socket.on("join", (userId) => {
      socket.join(userId);
      socket.join("team_chat");
      console.log(`Socket ${socket.id} joined rooms: ${userId} & team_chat`);
    });

    socket.on("team:send_message", (data) => {
      // Broadcast chat message to everyone in team_chat room except sender (or including sender)
      io.to("team_chat").emit("team:new_message", {
        id: Date.now().toString(),
        senderId: data.senderId,
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
