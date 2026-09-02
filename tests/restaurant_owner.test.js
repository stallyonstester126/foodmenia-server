import request from "supertest";
import app from "../src/app.js";
import { db } from "../src/database/connection.js";

describe("Foodmenia Backend Patch — Restaurant Owner Registration & Onboarding Tests", () => {
  let ownerToken = "";
  let ownerId = null;
  let restaurantId = null;
  let categoryId = null;
  let menuItemId = null;

  let customerToken = "";
  let customerId = null;

  const timestamp = Date.now();
  const ownerEmail = `owner_${timestamp}@foodmenia.com`;
  const customerEmail = `customer_${timestamp}@foodmenia.com`;
  const password = "Password123!";

  beforeAll(async () => {
    // 1. Register User as Restaurant Owner
    const regOwnerRes = await request(app).post("/api/v1/auth/register").send({
      name: "Test Owner",
      email: ownerEmail,
      password,
      phone: "+923001112233",
      accountType: "restaurant_owner",
    });

    expect(regOwnerRes.status).toBe(201);
    expect(regOwnerRes.body.data.user.role).toBe("restaurant_owner");
    ownerToken = regOwnerRes.body.data.tokens.accessToken;
    ownerId = regOwnerRes.body.data.user.id;

    // 2. Register Regular Customer
    const regCustRes = await request(app).post("/api/v1/auth/register").send({
      name: "Test Customer",
      email: customerEmail,
      password,
      accountType: "customer",
    });

    expect(regCustRes.status).toBe(201);
    expect(regCustRes.body.data.user.role).toBe("customer");
    customerToken = regCustRes.body.data.tokens.accessToken;
    customerId = regCustRes.body.data.user.id;
  });

  afterAll(async () => {
    if (restaurantId) {
      await db("menu_items").where({ restaurant_id: restaurantId }).del();
      await db("menu_categories").where({ restaurant_id: restaurantId }).del();
      await db("restaurant_cuisines").where({ restaurant_id: restaurantId }).del();
      await db("restaurants").where({ id: restaurantId }).del();
    }
    if (ownerId) {
      await db("refresh_tokens").where({ user_id: ownerId }).del();
      await db("users").where({ id: ownerId }).del();
    }
    if (customerId) {
      await db("refresh_tokens").where({ user_id: customerId }).del();
      await db("users").where({ id: customerId }).del();
    }
    await db.destroy();
  });

  describe("GET /api/v1/users/me — hasRestaurant field", () => {
    it("should return hasRestaurant: false before onboarding a restaurant", async () => {
      const res = await request(app)
        .get("/api/v1/users/me")
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe("restaurant_owner");
      expect(res.body.data.hasRestaurant).toBe(false);
    });
  });

  describe("POST /api/v1/restaurant-owner/restaurants — Self Onboarding", () => {
    it("should block non-restaurant_owner users (403)", async () => {
      const res = await request(app)
        .post("/api/v1/restaurant-owner/restaurants")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          name: "Unauthorized Grill",
        });

      expect(res.status).toBe(403);
    });

    it("should allow restaurant_owner to onboard a restaurant with is_active = false", async () => {
      const res = await request(app)
        .post("/api/v1/restaurant-owner/restaurants")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          name: `Owner Palace ${timestamp}`,
          description: "Authentic owner cooked meals",
          address: "123 Food Street",
          priceTier: "$$",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe(`Owner Palace ${timestamp}`);
      expect(res.body.data.is_active).toBe(false);
      restaurantId = res.body.data.id;
    });

    it("should return hasRestaurant: true after onboarding", async () => {
      const res = await request(app)
        .get("/api/v1/users/me")
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasRestaurant).toBe(true);
    });

    it("should prevent onboarding a second restaurant for the same owner (400)", async () => {
      const res = await request(app)
        .post("/api/v1/restaurant-owner/restaurants")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          name: "Second Restaurant Attempt",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("already have a restaurant");
    });
  });

  describe("Public Listing Isolation Check", () => {
    it("should NOT return newly onboarded restaurant in public GET /restaurants until approved", async () => {
      const res = await request(app)
        .get(`/api/v1/restaurants?search=${encodeURIComponent(`Owner Palace ${timestamp}`)}`);

      expect(res.status).toBe(200);
      const items = res.body.data.items || res.body.data || [];
      const found = items.find((r) => r.id === restaurantId);
      expect(found).toBeUndefined();
    });
  });

  describe("Restaurant Owner Scoped Management Endpoints", () => {
    it("GET /restaurant-owner/restaurant — retrieves owner restaurant profile", async () => {
      const res = await request(app)
        .get("/api/v1/restaurant-owner/restaurant")
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(restaurantId);
    });

    it("PATCH /restaurant-owner/restaurant — updates owner restaurant profile", async () => {
      const res = await request(app)
        .patch("/api/v1/restaurant-owner/restaurant")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          description: "Updated description for test owner palace",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe("Updated description for test owner palace");
    });

    it("POST /restaurant-owner/menu-categories — creates a menu category", async () => {
      const res = await request(app)
        .post("/api/v1/restaurant-owner/menu-categories")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          name: "Owner Specials",
          sort_order: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("Owner Specials");
      categoryId = res.body.data.id;
    });

    it("POST /restaurant-owner/menu-items — creates a menu item", async () => {
      const res = await request(app)
        .post("/api/v1/restaurant-owner/menu-items")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          category_id: categoryId,
          name: "Special Mutton Karahi",
          description: "Chef signature dish",
          base_price: 1200.0,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("Special Mutton Karahi");
      menuItemId = res.body.data.id;
    });

    it("GET /restaurant-owner/menu-items — lists owner menu items", async () => {
      const res = await request(app)
        .get("/api/v1/restaurant-owner/menu-items")
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((item) => item.id === menuItemId)).toBe(true);
    });

    it("GET /restaurant-owner/orders — lists scoped orders for owner with assigned rider details", async () => {
      // Create a test rider user & rider profile
      const riderEmail = `rider_${timestamp}@foodmenia.com`;
      const [riderUserId] = await db("users").insert({
        name: "Test Speedy Rider",
        email: riderEmail,
        password_hash: "dummyhash",
        phone: "+923009998877",
        role: "rider",
        email_verified: true,
      });

      const [riderId] = await db("riders").insert({
        user_id: riderUserId,
        account_status: "APPROVED",
        availability_status: "ONLINE",
        vehicle_type: "Motorcycle",
      });

      // Insert a test order for this owner's restaurant assigned to the test rider
      const [testOrderId] = await db("orders").insert({
        user_id: customerId,
        restaurant_id: restaurantId,
        fulfillment_type: "delivery",
        status: "preparing",
        subtotal: 500,
        delivery_fee: 50,
        platform_fee: 10,
        discount_amount: 0,
        total: 560,
        assigned_rider_id: riderId,
        rider_name: "Test Speedy Rider",
      });

      const res = await request(app)
        .get("/api/v1/restaurant-owner/orders")
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      const targetOrder = res.body.data.find((o) => o.id === testOrderId);
      expect(targetOrder).toBeDefined();
      expect(targetOrder.assigned_rider_id).toBe(riderId);
      expect(targetOrder.rider_name).toBe("Test Speedy Rider");
      expect(targetOrder.rider_phone).toBe("+923009998877");

      // Cleanup test order & rider
      await db("orders").where({ id: testOrderId }).del();
      await db("riders").where({ id: riderId }).del();
      await db("refresh_tokens").where({ user_id: riderUserId }).del();
      await db("users").where({ id: riderUserId }).del();
    });
  });
});
