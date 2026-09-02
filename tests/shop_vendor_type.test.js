import request from "supertest";
import app from "../src/app.js";
import { db } from "../src/database/connection.js";

describe("Foodmenia Backend Patch — Shop Vendor Type Support Tests", () => {
  let shopOwnerToken = "";
  let shopOwnerId = null;
  let shopId = null;

  let restOwnerToken = "";
  let restOwnerId = null;
  let restaurantId = null;

  const timestamp = Date.now();
  const shopOwnerEmail = `shop_owner_${timestamp}@foodmenia.com`;
  const restOwnerEmail = `rest_owner_${timestamp}@foodmenia.com`;
  const password = "Password123!";

  beforeAll(async () => {
    // 1. Register Shop Owner
    const regShopRes = await request(app).post("/api/v1/auth/register").send({
      name: "Shop Owner",
      email: shopOwnerEmail,
      password,
      accountType: "restaurant_owner",
    });
    expect(regShopRes.status).toBe(201);
    shopOwnerToken = regShopRes.body.data.tokens.accessToken;
    shopOwnerId = regShopRes.body.data.user.id;

    // 2. Register Restaurant Owner
    const regRestRes = await request(app).post("/api/v1/auth/register").send({
      name: "Restaurant Owner",
      email: restOwnerEmail,
      password,
      accountType: "restaurant_owner",
    });
    expect(regRestRes.status).toBe(201);
    restOwnerToken = regRestRes.body.data.tokens.accessToken;
    restOwnerId = regRestRes.body.data.user.id;
  });

  afterAll(async () => {
    if (shopId) {
      await db("restaurants").where({ id: shopId }).del();
    }
    if (restaurantId) {
      await db("restaurants").where({ id: restaurantId }).del();
    }
    if (shopOwnerId) {
      await db("refresh_tokens").where({ user_id: shopOwnerId }).del();
      await db("users").where({ id: shopOwnerId }).del();
    }
    if (restOwnerId) {
      await db("refresh_tokens").where({ user_id: restOwnerId }).del();
      await db("users").where({ id: restOwnerId }).del();
    }
  });

  test("1. Self-onboarding with type: 'shop' correctly stores type and defaults to is_active: false", async () => {
    const res = await request(app)
      .post("/api/v1/restaurant-owner/restaurants")
      .set("Authorization", `Bearer ${shopOwnerToken}`)
      .send({
        name: "FoodMenia Supermarket",
        description: "Fresh groceries and daily essentials",
        type: "shop",
        address: "789 Mart St, Lahore",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("FoodMenia Supermarket");
    expect(res.body.data.type).toBe("shop");
    expect(res.body.data.is_active).toBe(false); // Stays pending until admin approval
    shopId = res.body.data.id;
  });

  test("2. Self-onboarding with default/omitted type defaults to 'restaurant'", async () => {
    const res = await request(app)
      .post("/api/v1/restaurant-owner/restaurants")
      .set("Authorization", `Bearer ${restOwnerToken}`)
      .send({
        name: "Super Burgers & Grill",
        description: "Juicy burgers",
        address: "123 Food St, Lahore",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe("restaurant");
    expect(res.body.data.is_active).toBe(false);
    restaurantId = res.body.data.id;
  });

  test("3. GET /restaurants filtering by type=shop, type=restaurant, and omitting type", async () => {
    // Approve both vendors for public listing test
    await db("restaurants").where({ id: shopId }).update({ is_active: true });
    await db("restaurants").where({ id: restaurantId }).update({ is_active: true });

    // a) GET /restaurants?type=shop
    const shopListRes = await request(app).get("/api/v1/restaurants?type=shop");
    expect(shopListRes.status).toBe(200);
    const shopItems = shopListRes.body.data.items || shopListRes.body.data;
    expect(Array.isArray(shopItems)).toBe(true);
    expect(shopItems.length).toBeGreaterThan(0);
    expect(shopItems.every((item) => item.type === "shop")).toBe(true);
    expect(shopItems.some((item) => Number(item.id) === Number(shopId))).toBe(true);

    // b) GET /restaurants?type=restaurant
    const restListRes = await request(app).get("/api/v1/restaurants?type=restaurant");
    expect(restListRes.status).toBe(200);
    const restItems = restListRes.body.data.items || restListRes.body.data;
    expect(Array.isArray(restItems)).toBe(true);
    expect(restItems.length).toBeGreaterThan(0);
    expect(restItems.every((item) => item.type === "restaurant")).toBe(true);
    expect(restItems.some((item) => Number(item.id) === Number(restaurantId))).toBe(true);

    // c) GET /restaurants (omitted type parameter -> returns both types)
    const allListRes = await request(app).get("/api/v1/restaurants");
    expect(allListRes.status).toBe(200);
    const allItems = allListRes.body.data.items || allListRes.body.data;
    expect(Array.isArray(allItems)).toBe(true);
    expect(allItems.some((item) => Number(item.id) === Number(shopId))).toBe(true);
    expect(allItems.some((item) => Number(item.id) === Number(restaurantId))).toBe(true);
  });
});
