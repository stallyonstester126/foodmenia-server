import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { AuthRepository } from "./auth.repository.js";
import { EmailService } from "../../services/emailService.js";
import { env } from "../../config/env.js";
import { HTTP_STATUS } from "../../config/constants.js";
import { db } from "../../database/connection.js";

export class AuthService {
  static generateTokens(user) {
    const jti = crypto.randomUUID();
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || "customer",
      jti,
    };

    const accessToken = jwt.sign(payload, env.JWT.SECRET, {
      expiresIn: env.JWT.EXPIRY,
    });

    const refreshToken = jwt.sign(payload, env.JWT.REFRESH_SECRET, {
      expiresIn: env.JWT.REFRESH_EXPIRY,
    });

    return { accessToken, refreshToken };
  }

  static async register(name, email, password, phone = null, role = "customer", deviceInfo = null) {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await AuthRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      const error = new Error("User with this email already exists.");
      error.statusCode = HTTP_STATUS.CONFLICT;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    let createdUser;
    let tokens;

    await db.transaction(async (trx) => {
      const userId = await AuthRepository.createUser(
        { name, email: normalizedEmail, password_hash, phone, role },
        trx
      );
      await AuthRepository.createDefaultUserSettings(userId, trx);
      await trx("users").where({ id: userId }).update({
        verification_otp: otpCode,
        verification_otp_expires_at: otpExpiresAt,
      });

      createdUser = await trx("users")
        .where({ id: userId })
        .select("id", "name", "email", "phone", "avatar_url", "email_verified", "role", "created_at")
        .first();

      tokens = this.generateTokens(createdUser);

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await AuthRepository.saveRefreshToken(userId, tokens.refreshToken, expiresAt, deviceInfo, trx);
    });

    // Trigger Brevo verification email
    EmailService.sendAccountVerificationOTP(createdUser.email, createdUser.name, otpCode).catch((err) => {
      console.error("Async verification email trigger failed:", err);
    });

    return {
      user: {
        ...createdUser,
        email_verified: Boolean(createdUser.email_verified),
      },
      tokens,
    };
  }

  static async sendVerificationOTP(userIdOrEmail) {
    let user;
    if (typeof userIdOrEmail === "number" || !isNaN(Number(userIdOrEmail))) {
      user = await AuthRepository.findById(Number(userIdOrEmail));
    } else {
      user = await AuthRepository.findByEmail(String(userIdOrEmail));
    }

    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    if (user.email_verified) {
      return { message: "Account email is already verified." };
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await AuthRepository.setVerificationOtp(user.id, otpCode, expiresAt);
    await EmailService.sendAccountVerificationOTP(user.email, user.name, otpCode);

    return { message: "Verification OTP sent successfully to your email address." };
  }

  static async verifyEmail(identifier, otp) {
    if (!otp) {
      const error = new Error("Verification OTP code is required.");
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    let user;
    if (typeof identifier === "number" || !isNaN(Number(identifier))) {
      user = await AuthRepository.findById(Number(identifier));
    } else if (identifier) {
      user = await AuthRepository.findByEmail(String(identifier));
    }

    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    if (user.email_verified) {
      return { message: "Email is already verified.", email_verified: true };
    }

    const trimmedOtp = String(otp).trim();
    if (!user.verification_otp || user.verification_otp !== trimmedOtp) {
      const error = new Error("Invalid verification OTP code.");
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    if (!user.verification_otp_expires_at || new Date(user.verification_otp_expires_at) < new Date()) {
      const error = new Error("Verification OTP code has expired. Please request a new code.");
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    await AuthRepository.markEmailAsVerified(user.id);
    return { message: "Email address verified successfully!", email_verified: true };
  }

  static async login(email, password, deviceInfo = null) {
    const user = await AuthRepository.findByEmail(email);
    if (!user) {
      const error = new Error("Invalid email or password.");
      error.statusCode = HTTP_STATUS.UNAUTHORIZED;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const error = new Error("Invalid email or password.");
      error.statusCode = HTTP_STATUS.UNAUTHORIZED;
      throw error;
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatar_url,
      email_verified: Boolean(user.email_verified),
      role: user.role || "customer",
      created_at: user.created_at,
    };

    const tokens = this.generateTokens(safeUser);

    // Save refresh token hash
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await AuthRepository.saveRefreshToken(user.id, tokens.refreshToken, expiresAt, deviceInfo);

    return {
      user: safeUser,
      tokens,
    };
  }

  static async refreshToken(oldRefreshToken, deviceInfo = null) {
    let decoded;
    try {
      decoded = jwt.verify(oldRefreshToken, env.JWT.REFRESH_SECRET);
    } catch (err) {
      const error = new Error("Invalid or expired refresh token.");
      error.statusCode = HTTP_STATUS.UNAUTHORIZED;
      throw error;
    }

    // 1. Look up token in DB
    const tokenRecord = await AuthRepository.findRefreshToken(oldRefreshToken);
    if (!tokenRecord) {
      const error = new Error("Invalid refresh token. Not found.");
      error.statusCode = HTTP_STATUS.UNAUTHORIZED;
      throw error;
    }

    // 2. Token Reuse Attack Detection
    if (tokenRecord.revoked_at) {
      // Logic for logging and revoking
      await AuthRepository.revokeAllUserTokens(tokenRecord.user_id);
      const error = new Error("Potential token theft detected. All active sessions have been revoked. Please log in again.");
      error.statusCode = HTTP_STATUS.UNAUTHORIZED;
      throw error;
    }

    // 3. Expiration check
    if (new Date(tokenRecord.expires_at) < new Date()) {
      const error = new Error("Refresh token has expired. Please log in again.");
      error.statusCode = HTTP_STATUS.UNAUTHORIZED;
      throw error;
    }

    const user = await AuthRepository.findById(decoded.id);
    if (!user) {
      const error = new Error("User associated with refresh token not found.");
      error.statusCode = HTTP_STATUS.UNAUTHORIZED;
      throw error;
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || "customer",
    };

    // 4. Token Rotation (Revoke old token, issue new token pair)
    const newTokens = this.generateTokens(safeUser);

    await db.transaction(async (trx) => {
      // Revoke old token
      await trx("refresh_tokens")
        .where({ id: tokenRecord.id })
        .update({ revoked_at: db.fn.now() });

      // Save new token
      const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await AuthRepository.saveRefreshToken(user.id, newTokens.refreshToken, newExpiresAt, deviceInfo, trx);
    });

    return newTokens;
  }

  static async logout(refreshToken) {
    if (refreshToken) {
      await AuthRepository.revokeRefreshToken(refreshToken);
    }
    return { message: "Logged out successfully." };
  }

  static async logoutAll(userId) {
    await AuthRepository.revokeAllUserTokens(userId);
    return { message: "Successfully logged out from all devices." };
  }

  static async forgotPassword(email) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await AuthRepository.findByEmail(normalizedEmail);
    if (!user) {
      return { message: "If that email exists in our system, a password reset code has been sent." };
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await AuthRepository.setResetPasswordToken(user.id, resetToken, expiresAt);
    await AuthRepository.setVerificationOtp(user.id, otpCode, expiresAt);

    await EmailService.sendForgotPasswordOTP(user.email, user.name, otpCode);

    return {
      message: "Password reset OTP code sent to your email address.",
      resetToken,
    };
  }

  static async resetPassword(tokenOrOtp, newPassword, email = null) {
    const user = await AuthRepository.findByResetTokenOrOtp(tokenOrOtp, email);
    if (!user) {
      const error = new Error("Invalid or expired password reset code / token.");
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    await AuthRepository.updatePassword(user.id, password_hash);
    await AuthRepository.revokeAllUserTokens(user.id);

    return { message: "Password has been successfully reset. You may now login." };
  }

  static async changePassword(userId, currentPassword, newPassword, deviceInfo = null) {
    const user = await AuthRepository.findById(userId);
    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      const error = new Error("Incorrect current password.");
      error.statusCode = HTTP_STATUS.UNAUTHORIZED;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    await AuthRepository.updatePassword(userId, password_hash);

    // Security follow-through: revoke all existing sessions/refresh tokens
    await AuthRepository.revokeAllUserTokens(userId);

    // Generate fresh access/refresh token pair for current session
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatar_url,
      email_verified: Boolean(user.email_verified),
      role: user.role || "customer",
      created_at: user.created_at,
    };

    const tokens = this.generateTokens(safeUser);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await AuthRepository.saveRefreshToken(user.id, tokens.refreshToken, expiresAt, deviceInfo);

    return {
      message: "Password updated successfully.",
      tokens,
    };
  }
}
