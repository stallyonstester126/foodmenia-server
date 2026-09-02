import bcrypt from "bcryptjs";
import { db } from "./src/database/connection.js";

async function seedAdmin() {
  const email = "admin@foodmenia.com";
  const password = "AdminPassword123!";
  const name = "System Administrator";

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  const existing = await db("users").where({ email }).first();

  if (existing) {
    await db("users").where({ email }).update({
      password_hash,
      role: "admin",
      name,
    });
    console.log(`[SEED ADMIN] Updated existing user ${email} to admin role with password: ${password}`);
  } else {
    await db("users").insert({
      name,
      email,
      password_hash,
      role: "admin",
    });
    console.log(`[SEED ADMIN] Created new admin user ${email} with password: ${password}`);
  }

  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Failed to seed admin user:", err);
  process.exit(1);
});
