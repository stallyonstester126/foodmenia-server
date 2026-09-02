import { describe, it, expect, beforeAll } from "@jest/globals";
import supertest from "supertest";
import app from "../src/app.js";
import { db } from "../src/database/connection.js";

const request = supertest(app);

describe("Favorites System Integration Tests", () => {
  let user1Token;
  let user2Token;
  let user1Id;
  let user2Id;
  let testRestaurantId;
  let testMenuItemId;
  let user1FavId;

  beforeAll(async () => {
    // 1. Create User 1
    const u1Res = await request.post("/api/v1/auth/register").send({
      name: "Favorites Test User 1",
      email: `fav_user1_${Date.now()}@test.com`,
      password: "Password123!",
      accountType: "customer",
    });
    user1Token = u1Res.body.data.tokens.accessToken;
    user1Id = u1Res.body.data.user.id;

    // 2. Create User 2
    const u2Res = await request.post("/api/v1/auth/register").send({
      name: "Favorites Test User 2",
      email: `fav_user2_${Date.now()}@test.com`,
      password: "Password123!",
      accountType: "customer",
    });
    user2Token = u2Res.body.data.tokens.accessToken;
    user2Id = u2Res.body.data.user.id;

    // 3. Create a test restaurant
    const [rId] = await db("restaurants").insert({
      name: `Test Favorited Restaurant ${Date.now()}`,
      type: "restaurant",
      description: "Delicious test food",
      rating: 4.8,
      price_tier: "$$",
      is_active: true,
    });
    testRestaurantId = rId;

    // Link a cuisine to test restaurant
    const [cId] = await db("cuisines").insert({ name: `Fav Cuisine ${Date.now()}` });
    await db("restaurant_cuisines").insert({ restaurant_id: testRestaurantId, cuisine_id: cId });

    // Create a category for the restaurant
    const [catId] = await db("menu_categories").insert({
      restaurant_id: testRestaurantId,
      name: "Popular Test Items",
      sort_order: 1,
    });

    // 4. Create a test menu item
    const [mId] = await db("menu_items").insert({
      restaurant_id: testRestaurantId,
      category_id: catId,
      name: "Test Favorited Burger",
      description: "Juicy burger",
      base_price: 499.0,
      is_available: true,
    });
    testMenuItemId = mId;
  });

  it("1. should allow User 1 to favorite a restaurant", async () => {
    const res = await request
      .post("/api/v1/favorites")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ restaurantId: testRestaurantId });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(Number(res.body.data.restaurant_id)).toBe(testRestaurantId);
    user1FavId = res.body.data.id;
  });

  it("2. should prevent duplicate favorites for the same user and entity", async () => {
    const res = await request
      .post("/api/v1/favorites")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ restaurantId: testRestaurantId });

    // Returns existing favorite cleanly
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(user1FavId);

    // Confirm database only has 1 record for this user and restaurant
    const count = await db("favorites")
      .where({ user_id: user1Id, restaurant_id: testRestaurantId })
      .count("* as count");
    expect(Number(count[0].count)).toBe(1);
  });

  it("3. should allow User 1 to favorite a menu item", async () => {
    const res = await request
      .post("/api/v1/favorites")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ menuItemId: testMenuItemId });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(Number(res.body.data.menu_item_id)).toBe(testMenuItemId);
  });

  it("4. should return expanded favorites for User 1 via GET /favorites", async () => {
    const res = await request
      .get("/api/v1/favorites")
      .set("Authorization", `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);

    const favRest = res.body.data.find((f) => Number(f.restaurant_id) === testRestaurantId);
    expect(favRest).toBeDefined();
    expect(favRest.type).toBe("restaurant");
    expect(favRest.restaurant).toBeDefined();
    expect(favRest.restaurant.cuisines.length).toBeGreaterThan(0);

    const favItem = res.body.data.find((f) => Number(f.menu_item_id) === testMenuItemId);
    expect(favItem).toBeDefined();
    expect(favItem.type).toBe("menu_item");
    expect(favItem.menu_item).toBeDefined();
    expect(favItem.menu_item.name).toBe("Test Favorited Burger");
  });

  it("5. should reject User 2 trying to delete User 1's favorite with HTTP 403 Forbidden", async () => {
    const res = await request
      .delete(`/api/v1/favorites/${user1FavId}`)
      .set("Authorization", `Bearer ${user2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("Forbidden");

    // Confirm item was NOT deleted
    const dbFav = await db("favorites").where({ id: user1FavId }).first();
    expect(dbFav).toBeDefined();
  });

  it("6. should allow User 1 to delete their own favorite with HTTP 200", async () => {
    const res = await request
      .delete(`/api/v1/favorites/${user1FavId}`)
      .set("Authorization", `Bearer ${user1Token}`);

    expect(res.status).toBe(200);

    // Confirm item was deleted from DB
    const dbFav = await db("favorites").where({ id: user1FavId }).first();
    expect(dbFav).toBeUndefined();
  });
});
