import request from "supertest";
import app from "../src/app.js";
import { db } from "../src/database/connection.js";

describe("Foodmenia Backend API Integration Test Suite", () => {
  let authToken = "";
  let testUserId = null;
  let testRestaurantId = null;
  let testMenuItemId = null;
  let testAddressId = null;
  let createdOrderId = null;

  const testEmail = `tester_${Date.now()}@foodmenia.com`;

  afterAll(async () => {
    await db.destroy();
  });

  // 1. Health Check
  describe("GET /health", () => {
    it("should return operational health status and database ping", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("healthy");
      expect(res.body.data.database.status).toBe("connected");
    });
  });

  // 2. Auth Flow
  describe("Authentication Flow (/api/v1/auth)", () => {
    it("should register a new user with default settings", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Integration Tester",
          email: testEmail,
          password: "Password123!",
          phone: "+923001234567",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
      expect(res.body.data.tokens).toBeDefined();

      authToken = res.body.data.tokens.accessToken;
      testUserId = res.body.data.user.id;
    });

    it("should login with registered credentials", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: testEmail,
          password: "Password123!",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });

    it("should reject invalid login credentials", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: testEmail,
          password: "WrongPassword!",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // 3. User Profile & Address
  describe("Users & Address Management (/api/v1/users)", () => {
    it("should fetch authenticated user profile", async () => {
      const res = await request(app)
        .get("/api/v1/users/me")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(testUserId);
    });

    it("should add a delivery address", async () => {
      const res = await request(app)
        .post("/api/v1/users/addresses")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          label: "Home",
          full_address: "Apartment 4B, Foodmenia Towers, Lucena",
          city: "Lucena",
          is_default: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      testAddressId = res.body.data.id;
    });
  });

  // 4. Catalog & Restaurants
  describe("Restaurants & Menu Catalog (/api/v1/restaurants, /api/v1/menu-items)", () => {
    it("should list active restaurants with pagination", async () => {
      const res = await request(app).get("/api/v1/restaurants?limit=5");
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThan(0);

      // Select restaurant that has menu items
      const restWithItems = res.body.data.items.find((r) => r.name.includes("Al Basit")) || res.body.data.items[0];
      testRestaurantId = restWithItems.id;
    });

    it("should fetch menu items for the restaurant", async () => {
      const res = await request(app).get(`/api/v1/restaurants/${testRestaurantId}/menu`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      testMenuItemId = res.body.data[0].id;
    });

    it("should fetch item details with add-ons", async () => {
      const res = await request(app).get(`/api/v1/menu-items/${testMenuItemId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(testMenuItemId);
      expect(res.body.data.addon_groups).toBeDefined();
    });
  });

  // 5. Cart ➔ Checkout ➔ Order Flow
  describe("Cart ➔ Checkout ➔ Atomic Order Flow", () => {
    it("should add item to cart with price snapshot", async () => {
      const res = await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          menu_item_id: testMenuItemId,
          quantity: 2,
          special_instructions: "Extra sauce please",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.totals.subtotal).toBeGreaterThan(0);
    });

    it("should apply voucher WELCOME50 at checkout", async () => {
      await db("vouchers")
        .insert({
          code: "WELCOME50",
          discount_type: "percent",
          discount_value: 50.00,
          min_order_amount: 0,
          max_discount_amount: 500.00,
          usage_limit: 100,
          is_active: true,
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
        .onConflict("code")
        .merge({
          discount_type: "percent",
          discount_value: 50.00,
          min_order_amount: 0,
          max_discount_amount: 500.00,
          is_active: true,
        });

      const res = await request(app)
        .post("/api/v1/checkout/voucher/apply")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ code: "WELCOME50" });

      expect(res.status).toBe(200);
      expect(res.body.data.applied_voucher.code).toBe("WELCOME50");
      expect(res.body.data.totals.discount_amount).toBeGreaterThan(0);
    });

    it("should place order atomically in a MySQL transaction and clear cart", async () => {
      const res = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          address_id: testAddressId,
          voucher_code: "WELCOME50",
          delivery_instructions: "Leave at front door",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe("preparing");
      expect(res.body.data.items.length).toBeGreaterThan(0);

      createdOrderId = res.body.data.id;

      // Verify cart was cleared
      const cartRes = await request(app)
        .get("/api/v1/cart")
        .set("Authorization", `Bearer ${authToken}`);
      expect(cartRes.body.data.items.length).toBe(0);
    });

    it("should retrieve live tracking payload for placed order", async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${createdOrderId}/track`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.order_id).toBe(createdOrderId);
      expect(res.body.data.progress_percent).toBeGreaterThan(0);
      expect(res.body.data.timeline.length).toBe(4);
    });

    it("should allow sending in-app rider chat messages", async () => {
      const res = await request(app)
        .post(`/api/v1/orders/${createdOrderId}/message`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ message: "Hello, please ring the bell upon arrival." });

      expect(res.status).toBe(201);
      expect(res.body.data.message).toBe("Hello, please ring the bell upon arrival.");
    });
  });
});
