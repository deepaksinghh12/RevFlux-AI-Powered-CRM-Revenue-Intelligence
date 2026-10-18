/**
 * Sliding-window in-memory IP rate limiter.
 * @param {Object} options - { windowMs, maxRequests, message }
 */
export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  maxRequests = 30,
  message = "Too many requests, please try again later.",
}) => {
  const ipStore = new Map();

  // Periodic cleanup interval to prevent unbounded memory growth
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of ipStore.entries()) {
      const active = timestamps.filter((t) => now - t < windowMs);
      if (active.length === 0) {
        ipStore.delete(ip);
      } else {
        ipStore.set(ip, active);
      }
    }
  }, Math.max(windowMs, 60000));

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req, res, next) => {
    const ip =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      "127.0.0.1";
    const now = Date.now();

    if (!ipStore.has(ip)) {
      ipStore.set(ip, []);
    }

    const timestamps = ipStore.get(ip).filter((t) => now - t < windowMs);

    if (timestamps.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: "Too Many Requests",
        message,
      });
    }

    timestamps.push(now);
    ipStore.set(ip, timestamps);
    next();
  };
};

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 25,
  message: "Too many authentication attempts. Please try again in 15 minutes.",
});

export const aiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 50,
  message: "AI rate limit reached. Please wait a few minutes before making more requests.",
});

export const otpRequestLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: "Too many OTP requests. Please try again in 15 minutes.",
});

export const otpVerifyLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
  message: "Too many OTP verification attempts. Please try again later.",
});
