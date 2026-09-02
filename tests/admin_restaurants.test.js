import request from "supertest";
import app from "../src/app.js";
import { db } from "../src/database/connection.js";

describe("Admin Restaurants API Endpoints", () => {
  let adminToken;
  let tempRestaurantId;

  beforeAll(async () => {
    // 1. Seed or get Admin user
    const [adminUser] = await db("users")
      .where({ role: "admin" })
      .orWhere({ email: "admin@foodmenia.com" });

    if (adminUser) {
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: adminUser.email, password: "AdminPassword123!" });
      adminToken = loginRes.body.data?.tokens?.accessToken || loginRes.body.tokens?.accessToken;
    }

    if (!adminToken) {
      const regRes = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Test Admin",
          email: `admin_${Date.now()}@foodmenia.com`,
          password: "Password123!",
        });
      
      const newAdminId = regRes.body.data?.user?.id || regRes.body.user?.id;
      await db("users").where({ id: newAdminId }).update({ role: "admin" });

      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: regRes.body.data?.user?.email || regRes.body.user?.email, password: "Password123!" });
      adminToken = loginRes.body.data?.tokens?.accessToken || loginRes.body.tokens?.accessToken;
    }

    // 2. Create isolated temporary test restaurant so real database restaurants are never modified
    const ownerUser = await db("users").first();
    const ownerId = ownerUser ? ownerUser.id : 1;

    const [id] = await db("restaurants").insert({
      owner_id: ownerId,
      name: `Temp Isolation Test Restaurant ${Date.now()}`,
      is_active: false,
    });
    tempRestaurantId = id;
  });

  afterAll(async () => {
    if (tempRestaurantId) {
      await db("restaurants").where({ id: tempRestaurantId }).del();
    }
  });

  it("GET /api/v1/admin/restaurants - should list all restaurants for admin", async () => {
    const res = await request(app)
      .get("/api/v1/admin/restaurants")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("PATCH /api/v1/admin/restaurants/:id/toggle-active - should toggle active status without affecting real restaurants", async () => {
    if (!tempRestaurantId) return;

    // Toggle off -> on
    const res1 = await request(app)
      .patch(`/api/v1/admin/restaurants/${tempRestaurantId}/toggle-active`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res1.statusCode).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.is_active).toBe(true);

    // Toggle on -> off
    const res2 = await request(app)
      .patch(`/api/v1/admin/restaurants/${tempRestaurantId}/toggle-active`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res2.statusCode).toBe(200);
    expect(res2.body.success).toBe(true);
    expect(res2.body.data.is_active).toBe(false);
  });
});
