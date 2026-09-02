import { describe, it, expect, beforeAll } from "@jest/globals";
import supertest from "supertest";
import app from "../src/app.js";
import { db } from "../src/database/connection.js";

const request = supertest(app);

describe("Vouchers Module Integration & Admin Management Tests", () => {
  let customerToken;
  let adminToken;
  let adminUserId;
  let createdVoucherId;
  const testCode = `ADM_TEST_${Date.now()}`;

  beforeAll(async () => {
    // Register customer
    const userRes = await request.post("/api/v1/auth/register").send({
      name: "Voucher Test Customer",
      email: `voucher_cust_${Date.now()}@test.com`,
      password: "Password123!",
      accountType: "customer",
    });
    customerToken = userRes.body.data.tokens.accessToken;

    // Register admin user
    const adminRes = await request.post("/api/v1/auth/register").send({
      name: "Voucher Test Admin",
      email: `voucher_admin_${Date.now()}@test.com`,
      password: "Password123!",
      accountType: "customer",
    });
    adminToken = adminRes.body.data.tokens.accessToken;
    adminUserId = adminRes.body.data.user.id;

    // Elevate role to admin in DB
    await db("users").where({ id: adminUserId }).update({ role: "admin" });
  });

  it("1. should allow Admin to create a new voucher", async () => {
    const res = await request
      .post("/api/v1/admin/vouchers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: testCode,
        discount_type: "flat",
        discount_value: 50.00,
        min_order_amount: 100.00,
        usage_limit: 50,
        per_user_limit: 1,
        is_active: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.code).toBe(testCode);
    createdVoucherId = res.body.data.id;
  });

  it("2. should reject creating a duplicate voucher code with HTTP 400", async () => {
    const res = await request
      .post("/api/v1/admin/vouchers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        code: testCode,
        discount_type: "flat",
        discount_value: 50.00,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("already exists");
  });

  it("3. should list all vouchers for Admin via GET /admin/vouchers", async () => {
    const res = await request
      .get("/api/v1/admin/vouchers")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    const found = res.body.data.find((v) => v.id === createdVoucherId);
    expect(found).toBeDefined();
    expect(found.code).toBe(testCode);
    expect(found.redeemed_count).toBe(0);
  });

  it("4. should allow Admin to update a voucher", async () => {
    const res = await request
      .patch(`/api/v1/admin/vouchers/${createdVoucherId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        min_order_amount: 150.00,
        usage_limit: 100,
      });

    expect(res.status).toBe(200);
    expect(Number(res.body.data.min_order_amount)).toBe(150.00);
    expect(Number(res.body.data.usage_limit)).toBe(100);
  });

  it("5. should allow Admin to toggle active state of a voucher", async () => {
    // Toggle off
    const toggleOff = await request
      .patch(`/api/v1/admin/vouchers/${createdVoucherId}/toggle-active`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(toggleOff.status).toBe(200);
    expect(toggleOff.body.data.is_active).toBe(false);

    // Toggle back on
    const toggleOn = await request
      .patch(`/api/v1/admin/vouchers/${createdVoucherId}/toggle-active`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(toggleOn.status).toBe(200);
    expect(toggleOn.body.data.is_active).toBe(true);
  });

  it("6. should return redemptions list for Admin via GET /admin/vouchers/:id/redemptions", async () => {
    const res = await request
      .get(`/api/v1/admin/vouchers/${createdVoucherId}/redemptions`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  it("7. should allow deleting an unredeemed voucher", async () => {
    const res = await request
      .delete(`/api/v1/admin/vouchers/${createdVoucherId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    const deleted = await db("vouchers").where({ id: createdVoucherId }).first();
    expect(deleted).toBeUndefined();
  });
});
