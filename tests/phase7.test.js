import request from "supertest";
import app from "../src/app.js";
import { db } from "../src/database/connection.js";

describe("Foodmenia Phase 7 Integration Test Suite", () => {
  let customerToken = "";
  let customerId = null;
  let customerRefreshToken = "";

  let adminToken = "";
  let adminId = null;

  let createdRestaurantId = null;
  let createdMenuItemId = null;
  let customerAddressId = null;

  const timestamp = Date.now();
  const customerEmail = `p7_cust_${timestamp}@foodmenia.com`;
  const adminEmail = `p7_admin_${timestamp}@foodmenia.com`;

  afterAll(async () => {
    await db.destroy();
  });

  // Setup: Register Customer and Admin
  beforeAll(async () => {
    // 1. Customer
    const custRes = await request(app).post("/api/v1/auth/register").send({
      name: "Phase 7 Customer",
      email: customerEmail,
      password: "Password123!",
    });
    customerToken = custRes.body.data.tokens.accessToken;
    customerRefreshToken = custRes.body.data.tokens.refreshToken;
    customerId = custRes.body.data.user.id;

    // Add address
    const addrRes = await request(app)
      .post("/api/v1/users/addresses")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        label: "Home",
        full_address: "123 Main Street, Sector F-7",
        city: "Lucena",
        is_default: true,
      });
    customerAddressId = addrRes.body.data.id;

    // 2. Admin
    const adminRes = await request(app).post("/api/v1/auth/register").send({
      name: "Phase 7 Admin",
      email: adminEmail,
      password: "AdminPassword123!",
    });
    adminId = adminRes.body.data.user.id;

    // Promote to Admin in DB
    await db("users").where({ id: adminId }).update({ role: "admin" });

    // Login as Admin to get Admin JWT
    const adminLogin = await request(app).post("/api/v1/auth/login").send({
      email: adminEmail,
      password: "AdminPassword123!",
    });
    adminToken = adminLogin.body.data.tokens.accessToken;
  });

  // 1. Stripe Payments Module
  describe("Stripe Payment Integration (/api/v1/payments)", () => {
    it("should create a Stripe SetupIntent and assign a stripe_customer_id", async () => {
      const res = await request(app)
        .post("/api/v1/payments/setup-intent")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(201);
      expect(res.body.data.client_secret).toBeDefined();
      expect(res.body.data.customer_id).toBeDefined();
    });

    it("should save a Stripe payment method for user", async () => {
      const res = await request(app)
        .post("/api/v1/payments/methods")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          payment_method_id: "pm_card_visa",
          is_default: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.provider).toBe("stripe");
      expect(res.body.data.last4).toBeDefined();
    });

    it("should list saved payment methods", async () => {
      const res = await request(app)
        .get("/api/v1/payments/methods")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // 2. Refresh Token Rotation & Revocation
  describe("Refresh Token Revocation & Security (/api/v1/auth)", () => {
    let rotatedRefreshToken = "";

    it("should rotate refresh token and issue new token pair", async () => {
      const res = await request(app)
        .post("/api/v1/auth/refresh-token")
        .send({ refreshToken: customerRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      rotatedRefreshToken = res.body.data.refreshToken;
    });

    it("should reject reuse of revoked old refresh token and revoke all user sessions", async () => {
      // Reusing the old token
      const res = await request(app)
        .post("/api/v1/auth/refresh-token")
        .send({ refreshToken: customerRefreshToken });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain("theft detected");

      // Verify that even the newly rotated token was now revoked
      const followUpRes = await request(app)
        .post("/api/v1/auth/refresh-token")
        .send({ refreshToken: rotatedRefreshToken });

      expect(followUpRes.status).toBe(401);
    });

    it("should support logout-all to terminate all user sessions", async () => {
      // Re-login
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: customerEmail,
        password: "Password123!",
      });
      const newAuth = loginRes.body.data.tokens.accessToken;

      const logoutAllRes = await request(app)
        .post("/api/v1/auth/logout-all")
        .set("Authorization", `Bearer ${newAuth}`);

      expect(logoutAllRes.status).toBe(200);

      // Verify all refresh tokens revoked in DB
      const activeTokens = await db("refresh_tokens")
        .where({ user_id: customerId, revoked_at: null });
      expect(activeTokens.length).toBe(0);
    });
  });

  // 3. Admin API Surface & RBAC
  describe("Admin API Surface (/api/v1/admin)", () => {
    it("should reject customer from admin endpoints with 403 Forbidden", async () => {
      // Re-login customer
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: customerEmail,
        password: "Password123!",
      });
      customerToken = loginRes.body.data.tokens.accessToken;

      const res = await request(app)
        .post("/api/v1/admin/restaurants")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ name: "Hacker Cafe" });

      expect(res.status).toBe(403);
    });

    it("should allow admin to create a restaurant and menu item", async () => {
      // 1. Create Restaurant
      const restRes = await request(app)
        .post("/api/v1/admin/restaurants")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Admin Gourmet Kitchen",
          description: "Exclusive fine dining created via Admin API",
          address: "Admin Blvd 99",
          price_tier: "$$$",
        });

      expect(restRes.status).toBe(201);
      expect(restRes.body.data.name).toBe("Admin Gourmet Kitchen");
      createdRestaurantId = restRes.body.data.id;

      // 2. Create Category
      const catRes = await request(app)
        .post(`/api/v1/admin/restaurants/${createdRestaurantId}/categories`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Chef Specials" });

      expect(catRes.status).toBe(201);
      const categoryId = catRes.body.data.id;

      // 3. Create Menu Item
      const itemRes = await request(app)
        .post(`/api/v1/admin/restaurants/${createdRestaurantId}/menu-items`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          category_id: categoryId,
          name: "Wagyu Truffle Burger",
          base_price: 1299.00,
        });

      expect(itemRes.status).toBe(201);
      expect(itemRes.body.data.name).toBe("Wagyu Truffle Burger");
      createdMenuItemId = itemRes.body.data.id;
    });

    it("should show admin-created restaurant and item on public endpoints", async () => {
      const res = await request(app).get(`/api/v1/menu-items/${createdMenuItemId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Wagyu Truffle Burger");
    });
  });

  // 4. Order Placement Idempotency
  describe("Order Placement Idempotency", () => {
    it("should return the exact same order when POST /orders is called with duplicate Idempotency-Key", async () => {
      // Clear and Add item to cart
      await request(app)
        .delete("/api/v1/cart")
        .set("Authorization", `Bearer ${customerToken}`);

      const addCartRes = await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          menu_item_id: createdMenuItemId,
          quantity: 1,
        });
      expect(addCartRes.status).toBe(201);

      const idempotencyKey = `idemp_${Date.now()}_abc123`;

      // First Request
      const firstRes = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .set("Idempotency-Key", idempotencyKey)
        .send({
          address_id: customerAddressId,
          delivery_instructions: "Leave at door",
        });

      expect(firstRes.status).toBe(201);
      const firstOrderId = firstRes.body.data.id;

      // Second Duplicate Request with SAME Idempotency-Key
      const secondRes = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .set("Idempotency-Key", idempotencyKey)
        .send({
          address_id: customerAddressId,
          delivery_instructions: "Leave at door",
        });

      expect(secondRes.status).toBe(201);
      expect(secondRes.headers["x-cache-lookup"]).toBe("HIT-IDEMPOTENT");
      expect(secondRes.body.data.id).toBe(firstOrderId);

      // Verify in DB that only 1 order exists for this attempt
      const ordersCount = await db("orders").where({ id: firstOrderId }).count("id as count");
      expect(ordersCount[0].count).toBe(1);
    });
  });
});
