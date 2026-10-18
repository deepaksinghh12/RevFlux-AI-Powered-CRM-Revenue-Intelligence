import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";

import connectDB from "./config/db.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";
import { globalLimiter } from "./middleware/rateLimiter.js";

import authRoutes from "./routes/auth.routes.js";
import leadRoutes from "./routes/lead.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import noteRoutes from "./routes/note.routes.js";
import taskRoutes from "./routes/task.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import captureRoutes from "./routes/capture.routes.js";
import outreachRoutes from "./routes/outreach.routes.js";
import teamRoutes from "./routes/team.routes.js";
import organizationRoutes from "./routes/organization.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import qaRoutes from "./routes/qa.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import { startAutoScoringJob } from "./jobs/autoScoring.js";

const app = express();

// Trust proxy if running behind reverse proxy (e.g. AWS App Runner, Nginx, Heroku)
app.set("trust proxy", 1);

// Initialize background jobs
startAutoScoringJob();

// -------------------- Security & Core Middleware -------------------- //

app.use(helmet()); // Secure HTTP headers
app.use(globalLimiter); // Apply rate limiting to all requests

const clientUrls = (process.env.CLIENT_URL || "")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...clientUrls,
  "https://revflux.deepaksinghdev.in",
  "https://www.revflux.deepaksinghdev.in",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        (origin && origin.endsWith(".vercel.app")) ||
        (origin && origin.endsWith(".deepaksinghdev.in")) ||
        process.env.NODE_ENV !== "production"
      ) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// -------------------- Routes -------------------- //
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/capture", captureRoutes);
app.use("/api/outreach", outreachRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/qa", qaRoutes);
app.use("/api/chat", chatRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "RevFlux API",
  });
});

// -------------------- Error handling (last) -------------------- //

app.use(notFound);
app.use(errorHandler);

// -------------------- Boot -------------------- //

import http from "http";
import { initSocket } from "./utils/socket.js";

const PORT = process.env.PORT || 8080;

const server = http.createServer(app);
initSocket(server);

const start = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`RevFlux API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

start();

export default app;