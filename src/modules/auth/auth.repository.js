import crypto from "crypto";
import { db } from "../../database/connection.js";

export class AuthRepository {
  static hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  static async findByEmail(email) {
    return db("users").where({ email: email.toLowerCase() }).first();
  }

  static async findById(id) {
    return db("users").where({ id }).first();
  }

  static async createUser(userData, trx = null) {
    const query = trx ? trx("users") : db("users");
    const [userId] = await query.insert({
      name: userData.name,
      email: userData.email.toLowerCase(),
      phone: userData.phone || null,
      password_hash: userData.password_hash,
      avatar_url: userData.avatar_url || null,
      email_verified: false,
      role: userData.role || "customer",
    });
    return userId;
  }

  static async createDefaultUserSettings(userId, trx = null) {
    const query = trx ? trx("user_settings") : db("user_settings");
    return query.insert({
      user_id: userId,
      language: "English",
      push_notifications: true,
      email_offers: true,
      show_tracking_cost: true,
    });
  }

  static async setResetPasswordToken(userId, token, expiresAt) {
    return db("users").where({ id: userId }).update({
      reset_password_token: token,
      reset_password_expires_at: expiresAt,
      updated_at: db.fn.now(),
    });
  }

  static async setVerificationOtp(userId, otp, expiresAt) {
    return db("users").where({ id: userId }).update({
      verification_otp: otp,
      verification_otp_expires_at: expiresAt,
      updated_at: db.fn.now(),
    });
  }

  static async markEmailAsVerified(userId) {
    return db("users").where({ id: userId }).update({
      email_verified: true,
      verification_otp: null,
      verification_otp_expires_at: null,
      updated_at: db.fn.now(),
    });
  }

  static async findByResetToken(token) {
    return db("users")
      .where({ reset_password_token: token })
      .andWhere("reset_password_expires_at", ">", db.fn.now())
      .first();
  }

  static async findByResetTokenOrOtp(tokenOrOtp, email = null) {
    let query = db("users").where((builder) => {
      builder.where({ reset_password_token: tokenOrOtp }).orWhere({ verification_otp: tokenOrOtp });
    }).andWhere((builder) => {
      builder.where("reset_password_expires_at", ">", db.fn.now())
        .orWhere("verification_otp_expires_at", ">", db.fn.now());
    });

    if (email) {
      query = query.andWhere({ email: email.toLowerCase() });
    }

    return query.first();
  }

  static async updatePassword(userId, passwordHash) {
    return db("users").where({ id: userId }).update({
      password_hash: passwordHash,
      reset_password_token: null,
      reset_password_expires_at: null,
      verification_otp: null,
      verification_otp_expires_at: null,
      updated_at: db.fn.now(),
    });
  }

  // Refresh Token Revocation & Tracking Queries
  static async saveRefreshToken(userId, rawToken, expiresAt, deviceInfo = null, trx = null) {
    const tokenHash = this.hashToken(rawToken);
    const query = trx ? trx("refresh_tokens") : db("refresh_tokens");
    return query.insert({
      user_id: userId,
      token_hash: tokenHash,
      device_info: deviceInfo,
      expires_at: expiresAt,
    });
  }

  static async findRefreshToken(rawToken) {
    const tokenHash = this.hashToken(rawToken);
    return db("refresh_tokens").where({ token_hash: tokenHash }).first();
  }

  static async revokeRefreshToken(rawToken) {
    const tokenHash = this.hashToken(rawToken);
    return db("refresh_tokens")
      .where({ token_hash: tokenHash })
      .update({ revoked_at: db.fn.now() });
  }

  static async revokeAllUserTokens(userId) {
    return db("refresh_tokens")
      .where({ user_id: userId, revoked_at: null })
      .update({ revoked_at: db.fn.now() });
  }
}
