import { describe, it, expect } from "@jest/globals";
import supertest from "supertest";
import app from "../src/app.js";

const request = supertest(app);

describe("Uploads Module Integration Tests", () => {
  let authToken;

  beforeAll(async () => {
    const userRes = await request.post("/api/v1/auth/register").send({
      name: "Upload Test User",
      email: `upload_user_${Date.now()}@test.com`,
      password: "Password123!",
    });
    authToken = userRes.body.data.tokens.accessToken;
  });

  it("should upload a valid image file with PNG magic header and return Data URI URL", async () => {
    // Valid PNG Magic Header Buffer: 89 50 4E 47 0D 0A 1A 0A
    const pngMagicHeaderBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52
    ]);

    const res = await request
      .post("/api/v1/uploads/image")
      .set("Authorization", `Bearer ${authToken}`)
      .field("purpose", "avatar")
      .attach("image", pngMagicHeaderBuffer, "avatar.png");

    expect(res.status).toBe(201);
    expect(res.body.data.url).toContain("data:image/png;base64,");
  });
});
