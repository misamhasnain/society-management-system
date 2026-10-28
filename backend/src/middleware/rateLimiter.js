import rateLimit from "express-rate-limit";

const tooMany = (message) => (req, res) =>
  res.status(429).json({ success: false, message, errors: [] });

// Login: 5 failed attempts per 15 minutes per IP (successful logins are not counted)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany("Too many login attempts. Please try again in 15 minutes."),
});

// Register: 10 requests per hour per IP
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany("Too many registrations from this network. Try again later."),
});