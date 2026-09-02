import { describe, it, expect } from "@jest/globals";
import supertest from "supertest";
import app from "../src/app.js";
import { db } from "../src/database/connection.js";

const request = supertest(app);

describe("Fix 2: Resource Ownership Security Verification", () => {
  let owner1Token;
  let owner2Token;
  let owner1RestaurantId;
  let owner2RestaurantId;
  let owner2CategoryId;
  let owner2MenuItemId;

  beforeAll(async () => {
    // 1. Create Owner 1
    const owner1Res = await request.post("/api/v1/auth/register").send({
      name: "Owner One Security Test",
      email: `owner1_sec_${Date.now()}@test.com`,
      password: "Password123!",
      accountType: "restaurant_owner",
    });
    owner1Token = owner1Res.body.data.tokens.accessToken;

    const r1 = await request
      .post("/api/v1/restaurant-owner/restaurants")
      .set("Authorization", `Bearer ${owner1Token}`)
      .send({ name: "Owner 1 Diner", address: "101 Main St" });
    expect(r1.status).toBe(201);
    owner1RestaurantId = r1.body.data.id;

    // 2. Create Owner 2
    const owner2Res = await request.post("/api/v1/auth/register").send({
      name: "Owner Two Security Test",
      email: `owner2_sec_${Date.now()}@test.com`,
      password: "Password123!",
      accountType: "restaurant_owner",
    });
    owner2Token = owner2Res.body.data.tokens.accessToken;

    const r2 = await request
      .post("/api/v1/restaurant-owner/restaurants")
      .set("Authorization", `Bearer ${owner2Token}`)
      .send({ name: "Owner 2 Diner", address: "202 Main St" });
    expect(r2.status).toBe(201);
    owner2RestaurantId = r2.body.data.id;

    // 3. Owner 2 creates a menu category
    const catRes = await request
      .post("/api/v1/restaurant-owner/menu-categories")
      .set("Authorization", `Bearer ${owner2Token}`)
      .send({ name: "Burgers" });
    expect(catRes.status).toBe(201);
    owner2CategoryId = catRes.body.data.id;

    // 4. Owner 2 creates a menu item inside category
    const itemRes = await request
      .post("/api/v1/restaurant-owner/menu-items")
      .set("Authorization", `Bearer ${owner2Token}`)
      .send({ name: "Owner 2 Burger", base_price: 350, category_id: owner2CategoryId });
    expect(itemRes.status).toBe(201);
    owner2MenuItemId = itemRes.body.data.id;
  });

  it("should reject Owner 1 attempting to update Owner 2's menu item with HTTP 404", async () => {
    const res = await request
      .patch(`/api/v1/restaurant-owner/menu-items/${owner2MenuItemId}`)
      .set("Authorization", `Bearer ${owner1Token}`)
      .send({ name: "Hacked Burger Name", base_price: 1 });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain("does not belong to your restaurant");

    // Confirm database row was NOT modified
    const dbItem = await db("menu_items").where({ id: owner2MenuItemId }).first();
    expect(dbItem.name).toBe("Owner 2 Burger");
    expect(Number(dbItem.base_price)).toBe(350);
  });

  it("should reject Owner 1 attempting to delete Owner 2's menu item with HTTP 404", async () => {
    const res = await request
      .delete(`/api/v1/restaurant-owner/menu-items/${owner2MenuItemId}`)
      .set("Authorization", `Bearer ${owner1Token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toContain("does not belong to your restaurant");

    // Confirm database row still exists
    const dbItem = await db("menu_items").where({ id: owner2MenuItemId }).first();
    expect(dbItem).toBeDefined();
  });
});
