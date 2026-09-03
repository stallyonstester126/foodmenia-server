import rateLimit from "express-rate-limit";
import { ApiResponse } from "../utils/apiResponse.js";
import { HTTP_STATUS } from "../config/constants.js";

// Global API rate limiter
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  handler: (req, res) => {
    return ApiResponse.error(
      res,
      "Too many requests from this IP. Please try again later.",
      HTTP_STATUS.TOO_MANY_REQUESTS
    );
  },
});

// Stricter rate limiter for Auth endpoints (login, register, forgot-password)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 auth attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  handler: (req, res) => {
    return ApiResponse.error(
      res,
      "Too many authentication attempts. Please try again in 15 minutes.",
      HTTP_STATUS.TOO_MANY_REQUESTS
    );
  },
});
