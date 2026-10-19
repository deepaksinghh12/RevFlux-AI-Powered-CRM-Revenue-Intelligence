/**
 * CORS origin validator ensuring consistent security boundaries across
 * Express REST APIs and Socket.IO WebSockets.
 */

export const isOriginAllowed = (origin) => {
  // Requests without an origin (such as mobile apps, server-to-server, or curl) are allowed
  if (!origin) return true;

  // Exact production frontend domains
  const exactProductionOrigins = [
    "https://revflux.deepaksinghdev.in",
    "https://www.revflux.deepaksinghdev.in",
  ];

  // In production, reject any localhost / loopback origins even if present in CLIENT_URL
  const isLoopbackOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (process.env.NODE_ENV === "production" && isLoopbackOrigin) {
    return false;
  }

  // Configured CLIENT_URL (supports comma-separated list of URLs)
  const clientUrls = (process.env.CLIENT_URL || "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  const allowedList = new Set([...exactProductionOrigins, ...clientUrls]);
  if (allowedList.has(origin)) {
    return true;
  }

  // Explicitly configured preview or staging origins
  const previewUrls = (process.env.ALLOWED_PREVIEWS || "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
  if (previewUrls.includes(origin)) {
    return true;
  }

  // Narrowly scoped RevFlux-specific Vercel preview pattern (e.g. https://revflux-xxx.vercel.app or https://revflux.vercel.app)
  // Rejects arbitrary Vercel origins like https://evil-phish.vercel.app or https://otherapp.vercel.app
  const isRevfluxVercelPreview = /^https:\/\/revflux(-[a-z0-9-]+)?\.vercel\.app$/.test(origin);
  if (isRevfluxVercelPreview) {
    return true;
  }

  // Development origins: allowed ONLY when NODE_ENV is NOT production
  if (process.env.NODE_ENV !== "production") {
    const devOrigins = [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:8080",
    ];
    if (devOrigins.includes(origin)) {
      return true;
    }
  }

  return false;
};

export const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};
