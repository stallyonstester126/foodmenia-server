import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { validate } from "../../middlewares/validate.js";
import { authRateLimiter } from "../../middlewares/rateLimiter.js";
import { authenticate } from "../../middlewares/auth.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  sendVerificationOtpSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "./auth.validation.js";

const router = Router();

router.post(
  "/register",
  authRateLimiter,
  validate(registerSchema),
  AuthController.register
);

router.post(
  "/login",
  authRateLimiter,
  validate(loginSchema),
  AuthController.login
);

router.post(
  "/send-verification-otp",
  authRateLimiter,
  validate(sendVerificationOtpSchema),
  AuthController.sendVerificationOTP
);

router.post(
  "/verify-email",
  authRateLimiter,
  validate(verifyEmailSchema),
  AuthController.verifyEmail
);

router.post(
  "/refresh-token",
  validate(refreshTokenSchema),
  AuthController.refreshToken
);

router.post(
  "/logout",
  authenticate,
  AuthController.logout
);

router.post(
  "/logout-all",
  authenticate,
  AuthController.logoutAll
);

router.post(
  "/forgot-password",
  authRateLimiter,
  validate(forgotPasswordSchema),
  AuthController.forgotPassword
);

router.post(
  "/reset-password",
  authRateLimiter,
  validate(resetPasswordSchema),
  AuthController.resetPassword
);

router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  AuthController.changePassword
);

export default router;
