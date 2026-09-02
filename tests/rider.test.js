import request from "supertest";
import app from "../src/app.js";
import { db } from "../src/database/connection.js";

describe("Rider Portal & Dispatch API Integration Suite", () => {
  let riderToken;
  let riderUserId;
  let riderId;
  let testOrderId;
  let testEmail = `rider_${Date.now()}@foodmenia.com`;

  afterAll(async () => {
    if (riderUserId) {
      await db("users").where({ id: riderUserId }).delete();
    }
    await db.destroy();
  });

  it("POST /api/v1/rider/register - should register a new rider in PENDING status", async () => {
    const res = await request(app)
      .post("/api/v1/rider/register")
      .send({
        name: "Test Rider Express",
        email: testEmail,
        phone: "+92 300 9998877",
        password: "Password123!",
        vehicleType: "Motorcycle",
        vehicleNumber: "KHI-8899",
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rider).toBeDefined();
    expect(res.body.data.rider.account_status).toEqual("PENDING");

    riderToken = res.body.data.tokens.accessToken;
    riderUserId = res.body.data.user.id;
    riderId = res.body.data.rider.id;
  });

  it("POST /api/v1/rider/me/online - should REJECT going online before email verification & admin approval", async () => {
    const res = await request(app)
      .post("/api/v1/rider/me/online")
      .set("Authorization", `Bearer ${riderToken}`)
      .send({ online: true });

    expect(res.statusCode).toEqual(403);
    expect(res.body.success).toBe(false);
  });

  it("Admin Approval & Email Verification Flow", async () => {
    expect(riderUserId).toBeDefined();
    expect(riderId).toBeDefined();

    await db("users").where({ id: riderUserId }).update({ email_verified: true });
    await db("riders").where({ id: riderId }).update({ account_status: "APPROVED" });

    const riderProfile = await db("riders").where({ id: riderId }).first();
    expect(riderProfile.account_status).toEqual("APPROVED");
  });

  it("POST /api/v1/rider/me/online - should ALLOW approved rider to go ONLINE", async () => {
    const res = await request(app)
      .post("/api/v1/rider/me/online")
      .set("Authorization", `Bearer ${riderToken}`)
      .send({ online: true });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.availability_status).toEqual("ONLINE");
  });

  it("POST /api/v1/rider/me/location - should update live GPS coordinates", async () => {
    const res = await request(app)
      .post("/api/v1/rider/me/location")
      .set("Authorization", `Bearer ${riderToken}`)
      .send({
        lat: 24.8607,
        lng: 67.0011,
        heading: 180,
        speed: 35,
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.current_lat)).toEqual(24.8607);
  });

  it("GET /api/v1/rider/orders/available - should fetch available unassigned orders", async () => {
    const [restaurant] = await db("restaurants").limit(1);
    const [user] = await db("users").where({ role: "customer" }).limit(1);

    if (restaurant && user) {
      const [orderId] = await db("orders").insert({
        user_id: user.id,
        restaurant_id: restaurant.id,
        status: "preparing",
        subtotal: 1000,
        delivery_fee: 100,
        platform_fee: 50,
        total: 1150,
      });
      testOrderId = orderId;

      const res = await request(app)
        .get("/api/v1/rider/orders/available")
        .set("Authorization", `Bearer ${riderToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  it("POST /api/v1/rider/orders/:id/accept - should atomically accept the order", async () => {
    if (!testOrderId) return;

    const res = await request(app)
      .post(`/api/v1/rider/orders/${testOrderId}/accept`)
      .set("Authorization", `Bearer ${riderToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.assigned_rider_id).toEqual(riderId);

    const rider = await db("riders").where({ id: riderId }).first();
    expect(rider.availability_status).toEqual("BUSY");
  });

  it("POST /api/v1/rider/orders/:id/status - should update status to delivered and restore ONLINE status", async () => {
    if (!testOrderId) return;

    const res = await request(app)
      .post(`/api/v1/rider/orders/${testOrderId}/status`)
      .set("Authorization", `Bearer ${riderToken}`)
      .send({ status: "delivered" });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toEqual("delivered");

    const rider = await db("riders").where({ id: riderId }).first();
    expect(rider.availability_status).toEqual("ONLINE");
    expect(rider.current_order_id).toBeNull();
  });
});
