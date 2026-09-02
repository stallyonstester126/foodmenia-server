import request from "supertest";
import app from "../src/app.js";
import { db } from "../src/database/connection.js";

describe("Foodmenia Backend Patch — Integration Tests", () => {
  let userToken = "";
  let userRefreshToken = "";
  let userId = null;

  const timestamp = Date.now();
  const userEmail = `patch_user_${timestamp}@foodmenia.com`;
  const initialPassword = "Password123!";
  const updatedPassword = "NewPassword456!";

  beforeAll(async () => {
    // 1. Register User
    const regRes = await request(app).post("/api/v1/auth/register").send({
      name: "Patch Tester",
      email: userEmail,
      password: initialPassword,
      phone: "+923009998877",
    });

    userToken = regRes.body.data.tokens.accessToken;
    userRefreshToken = regRes.body.data.tokens.refreshToken;
    userId = regRes.body.data.user.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (userId) {
      await db("voucher_redemptions").where({ user_id: userId }).del();
      await db("refresh_tokens").where({ user_id: userId }).del();
      await db("users").where({ id: userId }).del();
    }
    await db.destroy();
  });

  describe("GET /api/v1/vouchers", () => {
    let activeVoucherId = null;
    let expiredVoucherId = null;
    let limitExhaustedVoucherId = null;

    beforeAll(async () => {
      // Seed test vouchers
      const [v1] = await db("vouchers").insert({
        code: `VALID_${timestamp}`,
        discount_type: "percent",
        discount_value: 15.0,
        min_order_amount: 100.0,
        valid_from: new Date(Date.now() - 100000),
        valid_until: new Date(Date.now() + 100000),
        usage_limit: 100,
        per_user_limit: 1,
        is_active: true,
      });
      activeVoucherId = v1;

      const [v2] = await db("vouchers").insert({
        code: `EXPIRED_${timestamp}`,
        discount_type: "flat",
        discount_value: 50.0,
        min_order_amount: 200.0,
        valid_from: new Date(Date.now() - 200000),
        valid_until: new Date(Date.now() - 100000), // Expired
        usage_limit: 100,
        per_user_limit: 1,
        is_active: true,
      });
      expiredVoucherId = v2;

      const [v3] = await db("vouchers").insert({
        code: `USERLIMIT_${timestamp}`,
        discount_type: "flat",
        discount_value: 20.0,
        min_order_amount: 100.0,
        valid_from: new Date(Date.now() - 100000),
        valid_until: new Date(Date.now() + 100000),
        usage_limit: 100,
        per_user_limit: 1,
        is_active: true,
      });
      limitExhaustedVoucherId = v3;

      // User redeems v3 once to hit per_user_limit
      await db("voucher_redemptions").insert({
        voucher_id: limitExhaustedVoucherId,
        user_id: userId,
      });
    });

    afterAll(async () => {
      await db("vouchers")
        .whereIn("id", [activeVoucherId, expiredVoucherId, limitExhaustedVoucherId].filter(Boolean))
        .del();
    });

    it("should return valid active vouchers and exclude expired/exhausted vouchers", async () => {
      const res = await request(app)
        .get("/api/v1/vouchers")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const codes = res.body.data.map((v) => v.code);
      expect(codes).toContain(`VALID_${timestamp}`);
      expect(codes).not.toContain(`EXPIRED_${timestamp}`);
      expect(codes).not.toContain(`USERLIMIT_${timestamp}`);

      const validVoucher = res.body.data.find((v) => v.code === `VALID_${timestamp}`);
      expect(validVoucher).toHaveProperty("id");
      expect(validVoucher).toHaveProperty("code");
      expect(validVoucher).toHaveProperty("discountType", "percent");
      expect(validVoucher).toHaveProperty("discountValue", 15);
      expect(validVoucher).toHaveProperty("minOrderAmount", 100);
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).get("/api/v1/vouchers");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/v1/auth/change-password", () => {
    it("should reject change password with wrong current password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          currentPassword: "WrongPassword999!",
          newPassword: updatedPassword,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should successfully change password and return fresh tokens", async () => {
      const res = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          currentPassword: initialPassword,
          newPassword: updatedPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it("should verify old refresh token is revoked after password change", async () => {
      const res = await request(app)
        .post("/api/v1/auth/refresh-token")
        .send({
          refreshToken: userRefreshToken,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should allow login with new password", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: userEmail,
        password: updatedPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });
  });
});
