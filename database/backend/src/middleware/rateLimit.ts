import rateLimit from "express-rate-limit";

/** Tight limiter for auth endpoints — register/login/password-reset/OTP are brute-force targets. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

/** Looser general-purpose limiter for the rest of the API. */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded." },
});

/** Stricter limiter for money-movement endpoints (deposits/withdrawals). */
export const financialRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many financial requests. Please try again later." },
});
