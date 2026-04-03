import rateLimit from 'express-rate-limit';

/**
 * Rate limiting middleware using memory store (NO Redis)
 */

// OTP endpoints - 5 requests per 15 minutes per IP
export const otpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again after 15 minutes.',
    errorCode: 'RATE_LIMIT_EXCEEDED',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Public routes - 100 requests per 15 minutes per IP
export const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
    errorCode: 'RATE_LIMIT_EXCEEDED',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authenticated routes - 500 requests per 15 minutes per IP
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    errorCode: 'RATE_LIMIT_EXCEEDED',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for sensitive operations (e.g., password reset)
export const strictRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many attempts. Please try again after 1 hour.',
    errorCode: 'RATE_LIMIT_EXCEEDED',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  otpRateLimit,
  publicRateLimit,
  authRateLimit,
  strictRateLimit,
};
